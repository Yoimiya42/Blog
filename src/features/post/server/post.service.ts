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
  BLANK_DRAFT_TITLE,
  BLANK_DRAFT_SLUG_PATTERN,
  isBlankDraftIdentity,
  MAX_PINNED_POSTS,
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
const SLUG_PLACEHOLDER = "Choose a slug before publishing.";
const COVER_UNKNOWN = "Choose a cover from the library.";
const PIN_LIMIT = `Up to ${MAX_PINNED_POSTS} posts can be pinned. Unpin one first.`;
const PIN_UNREADABLE = "Pinned could not be read.";

function randomHex(bytes: number): string {
  const values = new Uint8Array(bytes);
  crypto.getRandomValues(values);
  return Array.from(values, (value) =>
    value.toString(16).padStart(2, "0"),
  ).join("");
}

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

/**
 * A cover must name stored media. A deleted image is accepted, like a deleted
 * image in the content, so the post stays saveable (ADR-0025); it simply no
 * longer renders.
 */
async function coverError(
  coverId: unknown,
  media: MediaReferenceResolver | undefined,
): Promise<string | undefined> {
  if (coverId === undefined || coverId === null) return undefined;
  if (typeof coverId !== "string" || coverId === "") return COVER_UNKNOWN;
  if (!media) return undefined;

  return (await media.findKnown([coverId])).has(coverId)
    ? undefined
    : COVER_UNKNOWN;
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

  /**
   * FR-BLOG-17 limit. Checked before the write, not inside it: with a single
   * owner a concurrent pin is not a real case, and public reads cap the list.
   */
  async function pinError(
    pinned: unknown,
    alreadyPinned: boolean,
    exceptId?: string,
  ): Promise<string | undefined> {
    if (pinned === undefined) return undefined;
    if (typeof pinned !== "boolean") return PIN_UNREADABLE;
    if (!pinned || alreadyPinned) return undefined;

    return (await posts.countPinned(exceptId)) >= MAX_PINNED_POSTS
      ? PIN_LIMIT
      : undefined;
  }

  function withTags(
    result: PostMutationResult,
    resolved: Tag[] | undefined,
  ): PostMutationResult {
    return result.ok && resolved ? { ...result, tags: resolved } : result;
  }

  return {
    /** Every tag in the library, for the edit form's tag picker. */
    async listAllTags(actor: PostActor): Promise<Tag[]> {
      assertOwner(actor);

      return tags.list();
    },

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

    /**
     * New post (ADR-0030): reuses an untouched blank draft, otherwise stores a
     * new one with placeholder title and slug, so autosave has a row at once.
     */
    async createBlankDraft(actor: PostActor): Promise<Post> {
      assertOwner(actor);

      for (const summary of await posts.listAll()) {
        if (summary.status !== "DRAFT" || !isBlankDraftIdentity(summary)) {
          continue;
        }
        const post = await posts.findById(summary.id);
        const postTags = (await tags.listByPostIds([summary.id])).get(
          summary.id,
        );
        if (
          post &&
          (postTags?.length ?? 0) === 0 &&
          JSON.stringify(post.content) ===
            JSON.stringify(EMPTY_ARTICLE_DOCUMENT)
        ) {
          return post;
        }
      }

      // A clash on six random hex characters is unlikely; retry a few times.
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          return await posts.insert(
            {
              id: newId(),
              title: BLANK_DRAFT_TITLE,
              slug: `untitled-${randomHex(3)}`,
              summary: null,
              content: EMPTY_ARTICLE_DOCUMENT,
              contentSchemaVersion: CONTENT_SCHEMA_VERSION,
              status: "DRAFT",
              publishedAt: null,
            },
            now(),
          );
        } catch (error) {
          if (!(error instanceof PostSlugTakenError)) throw error;
        }
      }

      throw new Error("Could not allocate a blank draft slug.");
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
      const invalidCover = await coverError(input.coverId, media);
      const invalidPin = await pinError(input.pinned, false);
      if (
        !parsed.ok ||
        invalidContent ||
        !tagNames.ok ||
        invalidCover ||
        invalidPin
      ) {
        return {
          ok: false,
          reason: "invalid",
          fieldErrors: {
            ...(parsed.ok ? {} : parsed.fieldErrors),
            ...(invalidContent ? { content: invalidContent } : {}),
            ...(tagNames.ok ? {} : { tags: tagNames.message }),
            ...(invalidCover ? { coverId: invalidCover } : {}),
            ...(invalidPin ? { pinned: invalidPin } : {}),
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
            coverId: input.coverId ?? null,
            pinnedAt: input.pinned === true ? now() : null,
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
      const invalidCover = await coverError(input.coverId, media);
      const invalidPin = await pinError(
        input.pinned,
        current.pinnedAt !== null,
        id,
      );
      if (
        !parsed.ok ||
        invalidContent ||
        !tagNames.ok ||
        invalidCover ||
        invalidPin
      ) {
        return {
          ok: false,
          reason: "invalid",
          fieldErrors: {
            ...(parsed.ok ? {} : parsed.fieldErrors),
            ...(invalidContent ? { content: invalidContent } : {}),
            ...(tagNames.ok ? {} : { tags: tagNames.message }),
            ...(invalidCover ? { coverId: invalidCover } : {}),
            ...(invalidPin ? { pinned: invalidPin } : {}),
          },
        };
      }

      const patch: PostPatch = { ...parsed.fields };
      if (input.coverId !== undefined) patch.coverId = input.coverId;
      // A repeated pin keeps its original time, so the order stays stable.
      if (input.pinned === true && current.pinnedAt === null) {
        patch.pinnedAt = now();
      } else if (input.pinned === false && current.pinnedAt !== null) {
        patch.pinnedAt = null;
      }
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
      /** Absent keeps the stored title (ADR-0035). */
      title?: unknown,
    ): Promise<PostAutosaveResult> {
      assertOwner(actor);

      const invalidContent = await checkContent(content);
      if (invalidContent) {
        return { ok: false, reason: "invalid", message: invalidContent };
      }

      const parsedTitle =
        title === undefined
          ? undefined
          : postInputSchema.shape.title.safeParse(title);
      if (parsedTitle && !parsedTitle.success) {
        return {
          ok: false,
          reason: "invalid",
          message: parsedTitle.error.issues[0]?.message ?? "Invalid title.",
        };
      }

      const current = await posts.findById(id);
      if (!current) return { ok: false, reason: "not_found" };
      if (current.status !== "DRAFT") return { ok: false, reason: "not_draft" };

      // Publishing bumps `updated_at`, so the token also rejects a draft that
      // was published after the status check above.
      const post = await posts.update(
        id,
        {
          content,
          contentSchemaVersion: CONTENT_SCHEMA_VERSION,
          ...(parsedTitle ? { title: parsedTitle.data } : {}),
        },
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

      // A placeholder slug would become the permanent public URL (ADR-0030).
      if (BLANK_DRAFT_SLUG_PATTERN.test(current.slug)) {
        return {
          ok: false,
          reason: "invalid",
          fieldErrors: { slug: SLUG_PLACEHOLDER },
        };
      }

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
