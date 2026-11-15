import {
  CONTENT_SCHEMA_VERSION,
  EMPTY_ARTICLE_DOCUMENT,
} from "../content/types";
import { validateArticleDocument } from "../content/validate";
import {
  POST_STATUSES,
  PostAccessDeniedError,
  PostSlugTakenError,
  postInputSchema,
  type Post,
  type PostAutosaveResult,
  type PostField,
  type PostFieldErrors,
  type PostInput,
  type PostMutationResult,
  type PostPatch,
  type PostsByStatus,
  type PostWriteCondition,
} from "../schema";
import type { PostRepository } from "./post.repository";

/** The session of the caller, or nothing when the request is anonymous. */
export type PostActor = { user: { role?: unknown } } | null | undefined;

const SLUG_TAKEN = "This slug is already used by another post.";
const SLUG_FROZEN = "The slug cannot change after the post is published.";

/**
 * Why a conditional update matched no row. The post existed just before the
 * write, so with a version token the likely cause is a newer write.
 */
function missedWrite(condition: PostWriteCondition): "conflict" | "not_found" {
  return condition.ifUpdatedAt === undefined ? "not_found" : "conflict";
}

interface PostServiceDependencies {
  posts: PostRepository;
  /** The auth module owns the owner rule; the service only applies it. */
  isOwner: (actor: PostActor) => boolean;
  now?: () => Date;
  newId?: () => string;
}

type ParsedInput =
  | { ok: true; fields: Pick<Post, "title" | "slug" | "summary"> }
  | { ok: false; fieldErrors: PostFieldErrors };

function parseFields(input: PostInput): ParsedInput {
  const parsed = postInputSchema.safeParse(input);
  if (parsed.success) return { ok: true, fields: parsed.data };

  const fieldErrors: PostFieldErrors = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0] as PostField;
    // Keep the first issue per field: later ones follow from it.
    fieldErrors[field] ??= issue.message;
  }

  return { ok: false, fieldErrors };
}

function contentError(content: unknown): string | undefined {
  const result = validateArticleDocument(content);
  if (result.ok) return undefined;

  const [first] = result.issues;

  return first ? `${first.path}: ${first.message}` : "Invalid content.";
}

export function createPostService({
  posts,
  isOwner,
  now = () => new Date(),
  newId = () => crypto.randomUUID(),
}: PostServiceDependencies) {
  /**
   * Checked in every method, not only at the route: a service call from a new
   * entry point must not skip authorisation.
   */
  function assertOwner(actor: PostActor): void {
    if (!isOwner(actor)) throw new PostAccessDeniedError();
  }

  async function guardSlug(
    operation: () => Promise<PostMutationResult>,
  ): Promise<PostMutationResult> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof PostSlugTakenError) {
        return {
          ok: false,
          reason: "invalid",
          fieldErrors: { slug: SLUG_TAKEN },
        };
      }
      throw error;
    }
  }

  return {
    async listByStatus(actor: PostActor): Promise<PostsByStatus> {
      assertOwner(actor);

      const groups = Object.fromEntries(
        POST_STATUSES.map((status) => [status, []]),
      ) as unknown as PostsByStatus;
      for (const post of await posts.listAll()) groups[post.status].push(post);

      return groups;
    },

    async getById(actor: PostActor, id: string): Promise<Post | null> {
      assertOwner(actor);

      return posts.findById(id);
    },

    /** Always creates a draft. Publishing is a separate transition. */
    async create(
      actor: PostActor,
      input: PostInput,
    ): Promise<PostMutationResult> {
      assertOwner(actor);

      const parsed = parseFields(input);
      const content = input.content ?? EMPTY_ARTICLE_DOCUMENT;
      const invalidContent = contentError(content);
      if (!parsed.ok || invalidContent) {
        return {
          ok: false,
          reason: "invalid",
          fieldErrors: {
            ...(parsed.ok ? {} : parsed.fieldErrors),
            ...(invalidContent ? { content: invalidContent } : {}),
          },
        };
      }

      return guardSlug(async () => ({
        ok: true,
        post: await posts.insert(
          {
            id: newId(),
            ...parsed.fields,
            content,
            contentSchemaVersion: CONTENT_SCHEMA_VERSION,
            status: "DRAFT",
            publishedAt: null,
          },
          now(),
        ),
      }));
    },

    /**
     * Never changes `status` or `publishedAt`. The slug is frozen once the
     * post has been published, including after it is unpublished.
     */
    async update(
      actor: PostActor,
      id: string,
      input: PostInput,
      condition: PostWriteCondition = {},
    ): Promise<PostMutationResult> {
      assertOwner(actor);

      const current = await posts.findById(id);
      if (!current) return { ok: false, reason: "not_found" };

      const parsed = parseFields(input);
      if (
        parsed.ok &&
        current.publishedAt !== null &&
        parsed.fields.slug !== current.slug
      ) {
        return {
          ok: false,
          reason: "invalid",
          fieldErrors: { slug: SLUG_FROZEN },
        };
      }

      const invalidContent =
        input.content === undefined ? undefined : contentError(input.content);
      if (!parsed.ok || invalidContent) {
        return {
          ok: false,
          reason: "invalid",
          fieldErrors: {
            ...(parsed.ok ? {} : parsed.fieldErrors),
            ...(invalidContent ? { content: invalidContent } : {}),
          },
        };
      }

      const patch: PostPatch = { ...parsed.fields };
      if (input.content !== undefined) {
        patch.content = input.content;
        patch.contentSchemaVersion = CONTENT_SCHEMA_VERSION;
      }

      return guardSlug(async () => {
        const post = await posts.update(id, patch, now(), condition);
        if (post) return { ok: true, post };

        return { ok: false, reason: missedWrite(condition) };
      });
    },

    /**
     * Saves the document of a draft. Requires the version token, so a stale
     * tab cannot overwrite newer content. A published post is refused: its
     * content changes only through an explicit save.
     */
    async autosave(
      actor: PostActor,
      id: string,
      content: unknown,
      ifUpdatedAt: Date,
    ): Promise<PostAutosaveResult> {
      assertOwner(actor);

      const invalidContent = contentError(content);
      if (invalidContent) {
        return { ok: false, reason: "invalid", message: invalidContent };
      }

      const current = await posts.findById(id);
      if (!current) return { ok: false, reason: "not_found" };
      if (current.status !== "DRAFT") return { ok: false, reason: "not_draft" };

      // Publishing bumps `updated_at`, so the token also rejects a draft that
      // was published after the status check above.
      const post = await posts.update(
        id,
        { content, contentSchemaVersion: CONTENT_SCHEMA_VERSION },
        now(),
        { ifUpdatedAt },
      );

      return post
        ? { ok: true, updatedAt: post.updatedAt }
        : { ok: false, reason: "conflict" };
    },

    /**
     * Makes the saved version public. `publishedAt` is set on first
     * publication only and survives unpublishing: it dates the post and
     * marks the slug as frozen.
     */
    async publish(
      actor: PostActor,
      id: string,
      condition: PostWriteCondition = {},
    ): Promise<PostMutationResult> {
      assertOwner(actor);

      const current = await posts.findById(id);
      if (!current) return { ok: false, reason: "not_found" };

      // The public renderer accepts only the current schema version.
      const invalidContent =
        current.contentSchemaVersion === CONTENT_SCHEMA_VERSION
          ? contentError(current.content)
          : "The stored content is not valid schema v1.";
      if (invalidContent) {
        return {
          ok: false,
          reason: "invalid",
          fieldErrors: { content: invalidContent },
        };
      }

      const post = await posts.update(
        id,
        { status: "PUBLISHED", publishedAt: current.publishedAt ?? now() },
        now(),
        condition,
      );
      if (!post) return { ok: false, reason: missedWrite(condition) };

      console.info(JSON.stringify({ event: "post.publish", postId: id }));

      return { ok: true, post };
    },

    /** Returns the post to draft. Keeps `publishedAt` and the frozen slug. */
    async unpublish(
      actor: PostActor,
      id: string,
      condition: PostWriteCondition = {},
    ): Promise<PostMutationResult> {
      assertOwner(actor);

      const current = await posts.findById(id);
      if (!current) return { ok: false, reason: "not_found" };

      const post = await posts.update(
        id,
        { status: "DRAFT" },
        now(),
        condition,
      );
      if (!post) return { ok: false, reason: missedWrite(condition) };

      console.info(JSON.stringify({ event: "post.unpublish", postId: id }));

      return { ok: true, post };
    },

    /** Soft delete. Returns false when the post is missing or already deleted. */
    async remove(actor: PostActor, id: string): Promise<boolean> {
      assertOwner(actor);

      const deleted = await posts.softDelete(id, now());
      if (deleted) {
        console.info(JSON.stringify({ event: "post.delete", postId: id }));
      }

      return deleted;
    },
  };
}

export type PostService = ReturnType<typeof createPostService>;

export async function getPostService(): Promise<PostService> {
  // Loaded lazily: the repository and the auth module need the Workers
  // runtime, and static imports would pull it into every consumer of the
  // post module, including the public renderer.
  const [{ getPostRepository }, { isOwnerSession }] = await Promise.all([
    import("./post.repository"),
    import("@/features/auth"),
  ]);

  return createPostService({
    posts: await getPostRepository(),
    isOwner: isOwnerSession,
  });
}
