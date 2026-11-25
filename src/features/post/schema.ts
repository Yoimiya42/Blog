import { z } from "zod";

// Type only: a runtime import would pull the tag repository into the client
// bundle through the post form.
import type { Tag } from "@/features/tag";

export const POST_STATUSES = ["DRAFT", "PUBLISHED"] as const;

/** Placeholder identity of a blank draft from New post (ADR-0030). */
export const BLANK_DRAFT_TITLE = "Untitled";
export const BLANK_DRAFT_SLUG_PATTERN = /^untitled-[0-9a-f]{6}$/;

/**
 * Where a post opens in the admin (FR-ADMIN-03): a published post in Preview,
 * a draft in Edit, where its writing continues.
 */
export function postOpenPath(post: {
  id: string;
  status: "DRAFT" | "PUBLISHED";
}): string {
  return post.status === "PUBLISHED"
    ? `/admin/posts/${post.id}/preview`
    : `/admin/posts/${post.id}`;
}

/** True while a draft still carries the New post placeholders. */
export function isBlankDraftIdentity(post: {
  title: string;
  slug: string;
}): boolean {
  return (
    post.title === BLANK_DRAFT_TITLE && BLANK_DRAFT_SLUG_PATTERN.test(post.slug)
  );
}

export type PostStatus = (typeof POST_STATUSES)[number];

/**
 * FR-BLOG-18: a fixed, deliberately small set. Keys are stored; names are the
 * product labels. Topics come from tags, not from new categories.
 */
export const POST_CATEGORIES = [
  "tech",
  "economy",
  "history",
  "prose",
  "monologue",
] as const;

export type PostCategory = (typeof POST_CATEGORIES)[number];

export const POST_CATEGORY_NAMES: Record<PostCategory, string> = {
  tech: "科技",
  economy: "经济观察",
  history: "历史观察",
  prose: "散文",
  monologue: "随笔独白",
};

export function isPostCategory(value: unknown): value is PostCategory {
  return (
    typeof value === "string" &&
    (POST_CATEGORIES as readonly string[]).includes(value)
  );
}

/** A post without its body. List queries never load `content`. */
export interface PostSummary {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  /** List cover media id (FR-BLOG-14). It may name a deleted image. */
  coverId: string | null;
  /** Pin time; null when not pinned (FR-BLOG-17). */
  pinnedAt: Date | null;
  /** Null only for a post never published with one (FR-BLOG-18). */
  category: PostCategory | null;
  status: PostStatus;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Post extends PostSummary {
  /**
   * Parsed JSON as stored. The repository does not validate the document:
   * callers upgrade it from `contentSchemaVersion` and validate it before use.
   */
  content: unknown;
  contentSchemaVersion: number;
}

export interface NewPost {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  content: unknown;
  contentSchemaVersion: number;
  /** Omitted for no cover. */
  coverId?: string | null;
  /** Omitted for not pinned. */
  pinnedAt?: Date | null;
  /** Omitted for no category. */
  category?: PostCategory | null;
  status: PostStatus;
  publishedAt: Date | null;
}

export type PostPatch = Partial<Omit<NewPost, "id">>;

export interface PublishedPostQuery {
  limit: number;
  offset: number;
  tagId?: string;
  /** Leaves pinned posts out, for the full view grid (FR-BLOG-15). */
  excludePinned?: boolean;
}

/** FR-BLOG-17: at most this many non-deleted posts are pinned. */
export const MAX_PINNED_POSTS = 3;

export const POST_TITLE_MAX_LENGTH = 200;
export const POST_SLUG_MAX_LENGTH = 100;
export const POST_SUMMARY_MAX_LENGTH = 300;

/** Slugs become URL path segments: lowercase ASCII words joined by hyphens. */
const POST_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Owner-editable post fields. `content` is checked separately against the
 * article schema, so its issues can be reported with document paths.
 */
export const postInputSchema = z.object({
  title: z
    .string({ error: "Title is required." })
    .trim()
    .min(1, { error: "Title is required." })
    .max(POST_TITLE_MAX_LENGTH, {
      error: `Title must be at most ${POST_TITLE_MAX_LENGTH} characters.`,
    }),
  slug: z
    .string({ error: "Slug is required." })
    .trim()
    .min(1, { error: "Slug is required." })
    .max(POST_SLUG_MAX_LENGTH, {
      error: `Slug must be at most ${POST_SLUG_MAX_LENGTH} characters.`,
    })
    .regex(POST_SLUG_PATTERN, {
      error: "Use lowercase letters, numbers, and single hyphens.",
    }),
  summary: z
    .string()
    .trim()
    .max(POST_SUMMARY_MAX_LENGTH, {
      error: `Summary must be at most ${POST_SUMMARY_MAX_LENGTH} characters.`,
    })
    .nullish()
    // A blank summary is stored as NULL, never as an empty string.
    .transform((value) => value || null),
});

/** Raw mutation input. Every field is validated by the service. */
export interface PostInput {
  title: string;
  slug: string;
  summary?: string | null;
  /** Omitted on update to keep the stored document. */
  content?: unknown;
  /** Comma-separated tag names. Omitted to keep the stored tags. */
  tags?: string;
  /** Media id of the cover; null removes it. Omitted to keep the stored one. */
  coverId?: string | null;
  /** Pins or unpins the post. Omitted to keep the stored pin. */
  pinned?: boolean;
  /** A category key; blank clears it. Omitted to keep the stored one. */
  category?: string | null;
}

export type PostField =
  | "title"
  | "slug"
  | "summary"
  | "content"
  | "tags"
  | "coverId"
  | "pinned"
  | "category";

export type PostFieldErrors = Partial<Record<PostField, string>>;

export type PostMutationResult =
  /** `tags` is present when the write set them. */
  | { ok: true; post: Post; tags?: Tag[] }
  | { ok: false; reason: "invalid"; fieldErrors: PostFieldErrors }
  | { ok: false; reason: "not_found" }
  /** The post changed after the caller last read it. Nothing was written. */
  | { ok: false; reason: "conflict" };

/**
 * Optimistic concurrency token: the `updatedAt` the caller last saw. A write
 * that carries it applies only while the stored value still matches.
 */
export interface PostWriteCondition {
  ifUpdatedAt?: Date;
}

/** Display form of a tag set, as the owner types it. */
export function formatTagNames(tags: readonly Pick<Tag, "name">[]): string {
  return tags.map((tag) => tag.name).join(", ");
}

/** Wire form of the token: epoch milliseconds as a decimal string. */
export function toPostVersion(updatedAt: Date): string {
  return String(updatedAt.getTime());
}

/** Undefined for anything that is not a token, such as a forged field. */
export function fromPostVersion(raw: unknown): Date | undefined {
  return typeof raw === "string" && /^\d{1,15}$/.test(raw)
    ? new Date(Number(raw))
    : undefined;
}

export type PostAutosaveResult =
  | { ok: true; updatedAt: Date }
  | { ok: false; reason: "invalid"; message: string }
  | { ok: false; reason: "not_found" | "conflict" | "not_draft" };

export type PostsByStatus = Record<PostStatus, PostSummary[]>;

export class PostAccessDeniedError extends Error {
  constructor() {
    super("post management requires the owner");
    this.name = "PostAccessDeniedError";
  }
}

export class PostSlugTakenError extends Error {
  constructor(readonly slug: string) {
    super(`post slug is already in use: ${slug}`);
    this.name = "PostSlugTakenError";
  }
}
