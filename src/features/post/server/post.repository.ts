import { getDatabase } from "@/lib/db/client";
import {
  fromEpochMilliseconds,
  isUniqueViolation,
  MAX_BOUND_PARAMETERS,
  toEpochMilliseconds,
  type EpochMilliseconds,
} from "@/lib/db/types";

import {
  MAX_PINNED_POSTS,
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
  cover_id: string | null;
  pinned_at: EpochMilliseconds | null;
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
  "id, slug, title, summary, cover_id, pinned_at, status, published_at, created_at, updated_at";
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
    coverId: row.cover_id,
    pinnedAt:
      row.pinned_at === null ? null : fromEpochMilliseconds(row.pinned_at),
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
  coverId: (value: string | null) => ["cover_id", value],
  pinnedAt: (value: Date | null) => ["pinned_at", toNullableEpoch(value)],
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

  /** Shared by the published list and its count, so pages always agree. */
  function publishedFilter(
    query: Omit<PublishedPostQuery, "limit" | "offset">,
  ) {
    const conditions = ["status = 'PUBLISHED'", "deleted_at IS NULL"];
    const values: string[] = [];
    if (query.tagId !== undefined) {
      conditions.push("id IN (SELECT post_id FROM post_tag WHERE tag_id = ?)");
      values.push(query.tagId);
    }
    if (query.excludePinned) conditions.push("pinned_at IS NULL");

    return { sql: conditions.join(" AND "), values };
  }

  async function selectPublished<Row>(
    columns: string,
    query: PublishedPostQuery,
  ): Promise<Row[]> {
    const filter = publishedFilter(query);
    const { results } = await db
      .prepare(
        `SELECT ${columns} FROM post
         WHERE ${filter.sql}
         ORDER BY published_at DESC, id DESC
         LIMIT ? OFFSET ?`,
      )
      .bind(...filter.values, query.limit, query.offset)
      .all<Row>();

    return results;
  }

  /**
   * Statements that replace the tag set of a post when `guard` holds. The
   * guard is an SQL condition with its bound values; the statements are
   * no-ops when it is false. Plain VALUES rows, so an unknown tag id fails the
   * foreign key and rolls back the surrounding batch instead of being dropped.
   */
  function tagReplacement(
    postId: string,
    tagIds: readonly string[],
    guard: { sql: string; values: (string | number)[] } = {
      sql: "1",
      values: [],
    },
  ): D1PreparedStatement[] {
    const unique = [...new Set(tagIds)];
    if (unique.length * 2 + guard.values.length > MAX_BOUND_PARAMETERS) {
      throw new RangeError(`too many tags for one post: ${unique.length}`);
    }

    const statements = [
      db
        .prepare(`DELETE FROM post_tag WHERE post_id = ? AND ${guard.sql}`)
        .bind(postId, ...guard.values),
    ];
    if (unique.length > 0) {
      statements.push(
        db
          .prepare(
            `INSERT INTO post_tag (post_id, tag_id)
             SELECT column1, column2
             FROM (VALUES ${unique.map(() => "(?, ?)").join(", ")})
             WHERE ${guard.sql}`,
          )
          .bind(...unique.flatMap((tagId) => [postId, tagId]), ...guard.values),
      );
    }

    return statements;
  }

  return {
    /**
     * With `tagIds`, the post and its tag set are written in one batch, which
     * D1 runs as a single transaction.
     */
    async insert(
      post: NewPost,
      now: Date,
      tagIds?: readonly string[],
    ): Promise<Post> {
      const timestamp = toEpochMilliseconds(now);
      const insert = db
        .prepare(
          `INSERT INTO post
             (id, slug, title, summary, content, content_schema_version,
              cover_id, pinned_at, status, published_at, created_at,
              updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           RETURNING ${POST_COLUMNS}`,
        )
        .bind(
          post.id,
          post.slug,
          post.title,
          post.summary,
          JSON.stringify(post.content),
          post.contentSchemaVersion,
          post.coverId ?? null,
          toNullableEpoch(post.pinnedAt ?? null),
          post.status,
          toNullableEpoch(post.publishedAt),
          timestamp,
          timestamp,
        );
      const row = await runSlugGuarded(post.slug, async () => {
        if (tagIds === undefined) return insert.first<PostRow>();

        const [inserted] = await db.batch<PostRow>([
          insert,
          ...tagReplacement(post.id, tagIds),
        ]);

        return inserted?.results[0] ?? null;
      });
      if (!row) throw new Error("post insert returned no row");

      return toPost(row);
    },

    /**
     * Returns null when the post does not exist, is soft-deleted, or no longer
     * has the `updated_at` named by `condition`. With `tagIds`, the tag set is
     * replaced in the same transaction and under the same condition, so a
     * write that loses the version race changes neither the post nor its tags.
     */
    async update(
      id: string,
      patch: PostPatch,
      now: Date,
      condition: PostWriteCondition = {},
      tagIds?: readonly string[],
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
      const filterValues: (string | number)[] = [id];
      if (condition.ifUpdatedAt !== undefined) {
        filters.push("updated_at = ?");
        filterValues.push(toEpochMilliseconds(condition.ifUpdatedAt));
      }

      const update = db
        .prepare(
          `UPDATE post SET ${assignments.join(", ")}
           WHERE ${filters.join(" AND ")}
           RETURNING ${POST_COLUMNS}`,
        )
        .bind(...values, ...filterValues);

      const row = await runSlugGuarded(patch.slug, async () => {
        if (tagIds === undefined) return update.first<PostRow>();

        // The tag statements run first and test the same filter as the update,
        // against the same pre-update row. Inside one transaction both see
        // that row, so either all three statements apply or none does.
        const guard = {
          sql: `EXISTS (SELECT 1 FROM post WHERE ${filters.join(" AND ")})`,
          values: filterValues,
        };
        const results = await db.batch<PostRow>([
          ...tagReplacement(id, tagIds, guard),
          update,
        ]);

        return results.at(-1)?.results[0] ?? null;
      });

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

    async countPublished(
      query: Omit<PublishedPostQuery, "limit" | "offset"> = {},
    ): Promise<number> {
      const filter = publishedFilter(query);
      const row = await db
        .prepare(`SELECT count(*) AS total FROM post WHERE ${filter.sql}`)
        .bind(...filter.values)
        .first<{ total: number }>();

      return row?.total ?? 0;
    },

    /** FR-BLOG-17: published pinned posts, most recently pinned first. */
    async listPinnedPublishedWithContent(): Promise<Post[]> {
      const { results } = await db
        .prepare(
          `SELECT ${POST_COLUMNS} FROM post
           WHERE status = 'PUBLISHED' AND deleted_at IS NULL
             AND pinned_at IS NOT NULL
           ORDER BY pinned_at DESC, id DESC
           LIMIT ?`,
        )
        .bind(MAX_PINNED_POSTS)
        .all<PostRow>();

      return results.map(toPost);
    },

    /** Non-deleted pinned posts of any status, other than `exceptId`. */
    async countPinned(exceptId?: string): Promise<number> {
      const row = await db
        .prepare(
          `SELECT count(*) AS total FROM post
           WHERE pinned_at IS NOT NULL AND deleted_at IS NULL AND id != ?`,
        )
        .bind(exceptId ?? "")
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

    /**
     * Title, raw content, and cover of every non-deleted post, drafts
     * included. Used by the media reference scan (ADR-0025); content is not
     * validated.
     */
    async listContentSources(): Promise<
      { id: string; title: string; content: unknown; coverId: string | null }[]
    > {
      const { results } = await db
        .prepare(
          `SELECT id, title, content, cover_id FROM post
           WHERE deleted_at IS NULL
           ORDER BY updated_at DESC, id DESC`,
        )
        .all<{
          id: string;
          title: string;
          content: string;
          cover_id: string | null;
        }>();

      return results.map((row) => ({
        id: row.id,
        title: row.title,
        content: JSON.parse(row.content) as unknown,
        coverId: row.cover_id,
      }));
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
      await db.batch(tagReplacement(postId, tagIds));
    },
  };
}

export type PostRepository = ReturnType<typeof createPostRepository>;

export async function getPostRepository(): Promise<PostRepository> {
  return createPostRepository(await getDatabase());
}
