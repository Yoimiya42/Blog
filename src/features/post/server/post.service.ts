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
  type PostField,
  type PostFieldErrors,
  type PostInput,
  type PostMutationResult,
  type PostPatch,
  type PostsByStatus,
} from "../schema";
import type { PostRepository } from "./post.repository";

/** The session of the caller, or nothing when the request is anonymous. */
export type PostActor = { user: { role?: unknown } } | null | undefined;

const SLUG_TAKEN = "This slug is already used by another post.";

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

    /** Never changes `status` or `publishedAt`. */
    async update(
      actor: PostActor,
      id: string,
      input: PostInput,
    ): Promise<PostMutationResult> {
      assertOwner(actor);

      const parsed = parseFields(input);
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
        const post = await posts.update(id, patch, now());

        return post ? { ok: true, post } : { ok: false, reason: "not_found" };
      });
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
