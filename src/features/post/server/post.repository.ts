import { getDatabase } from "@/lib/db/client";
import {
  fromEpochMilliseconds,
  isUniqueViolation,
  MAX_BOUND_PARAMETERS,
  toEpochMilliseconds,
  type EpochMilliseconds,
} from "@/lib/db/types";

import {
  POST_STATUSES,
  PostSlugTakenError,
  type NewPost,
  type Post,
  type PostPatch,
  type PostStatus,
  type PostSummary,
  type PostWriteCondition,
  type PublishedPostQuery,
} from "../schema";

interface PostSummaryRow {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  status: string;
  published_at: EpochMilliseconds | null;
  created_at: EpochMilliseconds;
  updated_at: EpochMilliseconds;
}

interface PostRow extends PostSummaryRow {
  content: string;
  content_schema_version: number;
}

const SUMMARY_COLUMNS =
  "id, slug, title, summary, status, published_at, created_at, updated_at";
const POST_COLUMNS = `${SUMMARY_COLUMNS}, content, content_schema_version`;

function toStatus(value: string): PostStatus {
  if ((POST_STATUSES as readonly string[]).includes(value)) {
    return value as PostStatus;
  }
  throw new Error(`unknown post status in database: ${value}`);
}

function toSummary(row: PostSummaryRow): PostSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    status: toStatus(row.status),
    publishedAt:
      row.published_at === null
        ? null
        : fromEpochMilliseconds(row.published_at),
    createdAt: fromEpochMilliseconds(row.created_at),
    updatedAt: fromEpochMilliseconds(row.updated_at),
  };
}

function toPost(row: PostRow): Post {
  return {
    ...toSummary(row),
    content: JSON.parse(row.content) as unknown,
    contentSchemaVersion: row.content_schema_version,
  };
}

function toNullableEpoch(date: Date | null): EpochMilliseconds | null {
  return date === null ? null : toEpochMilliseconds(date);
}

// Column names come from this fixed map, never from caller input.
const PATCH_COLUMNS = {
  slug: (value: string) => ["slug", value],
  title: (value: string) => ["title", value],
  summary: (value: string | null) => ["summary", value],
  content: (value: unknown) => ["content", JSON.stringify(value)],
  contentSchemaVersion: (value: number) => ["content_schema_version", value],
  status: (value: PostStatus) => ["status", value],
  publishedAt: (value: Date | null) => ["published_at", toNullableEpoch(value)],
} as const satisfies {
  [Key in keyof Required<PostPatch>]: (
    value: Required<PostPatch>[Key],
  ) => readonly [string, string | number | null];
};

export function createPostRepository(db: D1Database) {
  async function runSlugGuarded<T>(
    slug: string | undefined,
    operation: () => Promise<T>,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (slug !== undefined && isUniqueViolation(error, "post.slug")) {
        throw new PostSlugTakenError(slug);
      }
      throw error;
    }
  }

  async function selectPublished<Row>(
    columns: string,
    query: PublishedPostQuery,
  ): Promise<Row[]> {
    const tagFilter =
      query.tagId === undefined
        ? ""
        : "AND id IN (SELECT post_id FROM post_tag WHERE tag_id = ?)";
    const bound =
      query.tagId === undefined
        ? [query.limit, query.offset]
        : [query.tagId, query.limit, query.offset];
    const { results } = await db
      .prepare(
        `SELECT ${columns} FROM post
         WHERE status = 'PUBLISHED' AND deleted_at IS NULL ${tagFilter}
         ORDER BY published_at DESC, id DESC
         LIMIT ? OFFSET ?`,
      )
      .bind(...bound)
      .all<Row>();

    return results;
  }

  return {
    async insert(post: NewPost, now: Date): Promise<Post> {
      const timestamp = toEpochMilliseconds(now);
      const row = await runSlugGuarded(post.slug, () =>
        db
          .prepare(
            `INSERT INTO post
               (id, slug, title, summary, content, content_schema_version,
                status, published_at, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             RETURNING ${POST_COLUMNS}`,
          )
          .bind(
            post.id,
            post.slug,
            post.title,
            post.summary,
            JSON.stringify(post.content),
            post.contentSchemaVersion,
            post.status,
            toNullableEpoch(post.publishedAt),
            timestamp,
            timestamp,
          )
          .first<PostRow>(),
      );
      if (!row) throw new Error("post insert returned no row");

      return toPost(row);
    },

    /**
     * Returns null when the post does not exist, is soft-deleted, or no longer
     * has the `updated_at` named by `condition`.
     */
    async update(
      id: string,
      patch: PostPatch,
      now: Date,
      condition: PostWriteCondition = {},
    ): Promise<Post | null> {
      const assignments: string[] = [];
      const values: (string | number | null)[] = [];
      for (const key of Object.keys(PATCH_COLUMNS) as (keyof PostPatch)[]) {
        const value = patch[key];
        if (value === undefined) continue;
        const [column, bound] = (
          PATCH_COLUMNS[key] as (
            input: unknown,
          ) => readonly [string, string | number | null]
        )(value);
        assignments.push(`${column} = ?`);
        values.push(bound);
      }
      // Strictly increasing, so `updated_at` works as a version token even
      // when two writes land in the same millisecond.
      assignments.push("updated_at = max(?, updated_at + 1)");
      values.push(toEpochMilliseconds(now));

      const filters = ["id = ?", "deleted_at IS NULL"];
      values.push(id);
      if (condition.ifUpdatedAt !== undefined) {
        filters.push("updated_at = ?");
        values.push(toEpochMilliseconds(condition.ifUpdatedAt));
      }

      const row = await runSlugGuarded(patch.slug, () =>
        db
          .prepare(
            `UPDATE post SET ${assignments.join(", ")}
             WHERE ${filters.join(" AND ")}
             RETURNING ${POST_COLUMNS}`,
          )
          .bind(...values)
          .first<PostRow>(),
      );

      return row ? toPost(row) : null;
    },

    async findById(id: string): Promise<Post | null> {
      const row = await db
        .prepare(
          `SELECT ${POST_COLUMNS} FROM post
           WHERE id = ? AND deleted_at IS NULL`,
        )
        .bind(id)
        .first<PostRow>();

      return row ? toPost(row) : null;
    },

    /** Any status. The caller decides whether a draft may be shown. */
    async findBySlug(slug: string): Promise<Post | null> {
      const row = await db
        .prepare(
          `SELECT ${POST_COLUMNS} FROM post
           WHERE slug = ? AND deleted_at IS NULL`,
        )
        .bind(slug)
        .first<PostRow>();

      return row ? toPost(row) : null;
    },

    async listPublished(query: PublishedPostQuery): Promise<PostSummary[]> {
      const rows = await selectPublished<PostSummaryRow>(
        SUMMARY_COLUMNS,
        query,
      );

      return rows.map(toSummary);
    },

    /**
     * Like `listPublished`, with bodies. Public lists derive reading time from
     * the document; a page holds at most ten posts.
     */
    async listPublishedWithContent(query: PublishedPostQuery): Promise<Post[]> {
      const rows = await selectPublished<PostRow>(POST_COLUMNS, query);

      return rows.map(toPost);
    },

    async countPublished(tagId?: string): Promise<number> {
      const tagFilter =
        tagId === undefined
          ? ""
          : "AND id IN (SELECT post_id FROM post_tag WHERE tag_id = ?)";
      const row = await db
        .prepare(
          `SELECT count(*) AS total FROM post
           WHERE status = 'PUBLISHED' AND deleted_at IS NULL ${tagFilter}`,
        )
        .bind(...(tagId === undefined ? [] : [tagId]))
        .first<{ total: number }>();

      return row?.total ?? 0;
    },

    /** Admin list: drafts and published posts, most recently edited first. */
    async listAll(): Promise<PostSummary[]> {
      const { results } = await db
        .prepare(
          `SELECT ${SUMMARY_COLUMNS} FROM post
           WHERE deleted_at IS NULL
           ORDER BY updated_at DESC, id DESC`,
        )
        .all<PostSummaryRow>();

      return results.map(toSummary);
    },

    /** Returns false when the post does not exist or is already deleted. */
    async softDelete(id: string, now: Date): Promise<boolean> {
      const timestamp = toEpochMilliseconds(now);
      const result = await db
        .prepare(
          `UPDATE post SET deleted_at = ?, updated_at = ?
           WHERE id = ? AND deleted_at IS NULL`,
        )
        .bind(timestamp, timestamp, id)
        .run();

      return result.meta.changes > 0;
    },

    /** Replaces the full tag set of a post in one atomic batch. */
    async replaceTags(
      postId: string,
      tagIds: readonly string[],
    ): Promise<void> {
      const unique = [...new Set(tagIds)];
      const statements = [
        db.prepare("DELETE FROM post_tag WHERE post_id = ?").bind(postId),
      ];
      if (unique.length > 0) {
        // Plain VALUES rows, so an unknown tag id fails the foreign key and
        // rolls back the batch instead of being dropped silently.
        if (unique.length * 2 > MAX_BOUND_PARAMETERS) {
          throw new RangeError(`too many tags for one post: ${unique.length}`);
        }
        statements.push(
          db
            .prepare(
              `INSERT INTO post_tag (post_id, tag_id)
               VALUES ${unique.map(() => "(?, ?)").join(", ")}`,
            )
            .bind(...unique.flatMap((tagId) => [postId, tagId])),
        );
      }

      await db.batch(statements);
    },
  };
}

export type PostRepository = ReturnType<typeof createPostRepository>;

export async function getPostRepository(): Promise<PostRepository> {
  return createPostRepository(await getDatabase());
}
