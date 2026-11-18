import {
  parseTagNames,
  TagSlugTakenError,
  toTagSlug,
  type Tag,
  type TagRepository,
} from "@/features/tag";

import {
  CONTENT_SCHEMA_VERSION,
  EMPTY_ARTICLE_DOCUMENT,
} from "../content/types";
import {
  validateArticleDocument,
  validateMediaReferences,
  type MediaReferenceResolver,
  type MediaReferenceRule,
} from "../content/validate";
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
  tags: TagRepository;
  /** The auth module owns the owner rule; the service only applies it. */
  isOwner: (actor: PostActor) => boolean;
  /**
   * Rejects image nodes that name no stored media. Omitted only by tests that
   * do not exercise images.
   */
  media?: MediaReferenceResolver;
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

async function contentError(
  content: unknown,
  media: MediaReferenceResolver | undefined,
  rule: MediaReferenceRule,
): Promise<string | undefined> {
  const shape = validateArticleDocument(content);
  const result =
    shape.ok && media
      ? await validateMediaReferences(shape.document, media, rule)
      : shape;
  if (result.ok) return undefined;

  const [first] = result.issues;

  return first ? `${first.path}: ${first.message}` : "Invalid content.";
}

type ParsedTags =
  { ok: true; names?: string[] } | { ok: false; message: string };

/** Undefined names mean the input leaves the stored tags alone. */
function parseTags(input: PostInput): ParsedTags {
  if (input.tags === undefined) return { ok: true };
  if (typeof input.tags !== "string") {
    return { ok: false, message: "Tags could not be read." };
  }

  return parseTagNames(input.tags);
}

export function createPostService({
  posts,
  tags,
  isOwner,
  media,
  now = () => new Date(),
  newId = () => crypto.randomUUID(),
}: PostServiceDependencies) {
  // Saves accept deleted media; publishing needs live media (ADR-0025).
  const checkContent = (content: unknown) =>
    contentError(content, media, "known");
  const checkPublishable = (content: unknown) =>
    contentError(content, media, "live");

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

  /** Existing tags keep their stored name; unknown names create a tag. */
  async function resolveTags(names: readonly string[]): Promise<Tag[]> {
    const resolved: Tag[] = [];
    for (const name of names) {
      const slug = toTagSlug(name);
      const existing = await tags.findBySlug(slug);
      if (existing) {
        resolved.push(existing);
        continue;
      }
      try {
        resolved.push(await tags.insert({ id: newId(), slug, name }));
      } catch (error) {
        // Another request created the same tag after the lookup.
        if (!(error instanceof TagSlugTakenError)) throw error;
        const created = await tags.findBySlug(slug);
        if (!created) throw error;
        resolved.push(created);
      }
    }

    return resolved;
  }

  /**
   * Resolved before the post write, so the post and its tag set can be
   * written in one transaction. A write that then fails can leave a newly
   * created tag unused; tags are a lookup table, so that is harmless.
   */
  async function resolveTagSet(
    names: string[] | undefined,
  ): Promise<Tag[] | undefined> {
    return names === undefined ? undefined : resolveTags(names);
  }

  function withTags(
    result: PostMutationResult,
    resolved: Tag[] | undefined,
  ): PostMutationResult {
    return result.ok && resolved ? { ...result, tags: resolved } : result;
  }

  return {
    /** Tags of one post, for the edit form. */
    async listTags(actor: PostActor, postId: string): Promise<Tag[]> {
      assertOwner(actor);

      return (await tags.listByPostIds([postId])).get(postId) ?? [];
    },

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
      const invalidContent = await checkContent(content);
      const tagNames = parseTags(input);
      if (!parsed.ok || invalidContent || !tagNames.ok) {
        return {
          ok: false,
          reason: "invalid",
          fieldErrors: {
            ...(parsed.ok ? {} : parsed.fieldErrors),
            ...(invalidContent ? { content: invalidContent } : {}),
            ...(tagNames.ok ? {} : { tags: tagNames.message }),
          },
        };
      }

      // Allocated before tag resolution, which may allocate tag ids.
      const id = newId();
      const resolved = await resolveTagSet(tagNames.names);
      const created = await guardSlug(async () => ({
        ok: true,
        post: await posts.insert(
          {
            id,
            ...parsed.fields,
            content,
            contentSchemaVersion: CONTENT_SCHEMA_VERSION,
            status: "DRAFT",
            publishedAt: null,
          },
          now(),
          resolved?.map((tag) => tag.id),
        ),
      }));

      return withTags(created, resolved);
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
        input.content === undefined
          ? undefined
          : await checkContent(input.content);
      const tagNames = parseTags(input);
      if (!parsed.ok || invalidContent || !tagNames.ok) {
        return {
          ok: false,
          reason: "invalid",
          fieldErrors: {
            ...(parsed.ok ? {} : parsed.fieldErrors),
            ...(invalidContent ? { content: invalidContent } : {}),
            ...(tagNames.ok ? {} : { tags: tagNames.message }),
          },
        };
      }

      const patch: PostPatch = { ...parsed.fields };
      if (input.content !== undefined) {
        patch.content = input.content;
        patch.contentSchemaVersion = CONTENT_SCHEMA_VERSION;
      }

      const resolved = await resolveTagSet(tagNames.names);
      const updated = await guardSlug(async () => {
        const post = await posts.update(
          id,
          patch,
          now(),
          condition,
          resolved?.map((tag) => tag.id),
        );
        if (post) return { ok: true, post };

        return { ok: false, reason: missedWrite(condition) };
      });

      return withTags(updated, resolved);
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

      const invalidContent = await checkContent(content);
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
          ? await checkPublishable(current.content)
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
  const [
    { getPostRepository },
    { getTagRepository },
    { isOwnerSession },
    { getMediaService },
  ] = await Promise.all([
    import("./post.repository"),
    import("@/features/tag"),
    import("@/features/auth"),
    import("@/features/media"),
  ]);

  return createPostService({
    posts: await getPostRepository(),
    tags: await getTagRepository(),
    isOwner: isOwnerSession,
    media: await getMediaService(),
  });
}
