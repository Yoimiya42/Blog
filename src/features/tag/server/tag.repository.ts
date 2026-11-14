import { getDatabase } from "@/lib/db/client";
import { isUniqueViolation, placeholders } from "@/lib/db/types";

import { TagSlugTakenError, type Tag } from "../schema";

// Row and domain shapes are identical: every column is TEXT NOT NULL.
type TagRow = Tag;

interface PostTagRow extends TagRow {
  post_id: string;
}

export function createTagRepository(db: D1Database) {
  return {
    async insert(tag: Tag): Promise<Tag> {
      try {
        await db
          .prepare("INSERT INTO tag (id, slug, name) VALUES (?, ?, ?)")
          .bind(tag.id, tag.slug, tag.name)
          .run();
      } catch (error) {
        if (isUniqueViolation(error, "tag.slug"))
          throw new TagSlugTakenError(tag.slug);
        throw error;
      }

      return { id: tag.id, slug: tag.slug, name: tag.name };
    },

    async findBySlug(slug: string): Promise<Tag | null> {
      return db
        .prepare("SELECT id, slug, name FROM tag WHERE slug = ?")
        .bind(slug)
        .first<TagRow>();
    },

    async list(): Promise<Tag[]> {
      const { results } = await db
        .prepare("SELECT id, slug, name FROM tag ORDER BY name, id")
        .all<TagRow>();

      return results;
    },

    /**
     * Tags for a page of posts in one query. Posts without tags are absent
     * from the map. At most 100 post ids, the D1 bound-parameter limit.
     */
    async listByPostIds(
      postIds: readonly string[],
    ): Promise<Map<string, Tag[]>> {
      const tagsByPost = new Map<string, Tag[]>();
      if (postIds.length === 0) return tagsByPost;

      const { results } = await db
        .prepare(
          `SELECT post_tag.post_id, tag.id, tag.slug, tag.name
           FROM post_tag
           JOIN tag ON tag.id = post_tag.tag_id
           WHERE post_tag.post_id IN (${placeholders(postIds.length)})
           ORDER BY tag.name, tag.id`,
        )
        .bind(...postIds)
        .all<PostTagRow>();

      for (const row of results) {
        const tags = tagsByPost.get(row.post_id) ?? [];
        tags.push({ id: row.id, slug: row.slug, name: row.name });
        tagsByPost.set(row.post_id, tags);
      }

      return tagsByPost;
    },

    /** Hard delete. The foreign key removes the tag from every post. */
    async delete(id: string): Promise<boolean> {
      const result = await db
        .prepare("DELETE FROM tag WHERE id = ?")
        .bind(id)
        .run();

      return result.meta.changes > 0;
    },
  };
}

export type TagRepository = ReturnType<typeof createTagRepository>;

export async function getTagRepository(): Promise<TagRepository> {
  return createTagRepository(await getDatabase());
}
