import { z } from "zod";

// Type only: a runtime import would pull the tag repository into the client
// bundle through the post form.
import type { Tag } from "@/features/tag";

export const POST_STATUSES = ["DRAFT", "PUBLISHED"] as const;

/** Placeholder identity of a blank draft from New post (ADR-0030). */
export const BLANK_DRAFT_TITLE = "Untitled";
export const BLANK_DRAFT_SLUG_PATTERN = /^untitled-[0-9a-f]{6}$/;

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

/** A post without its body. List queries never load `content`. */
export interface PostSummary {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
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
  status: PostStatus;
  publishedAt: Date | null;
}

export type PostPatch = Partial<Omit<NewPost, "id">>;

export interface PublishedPostQuery {
  limit: number;
  offset: number;
  tagId?: string;
}

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
}

export type PostField = "title" | "slug" | "summary" | "content" | "tags";

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
