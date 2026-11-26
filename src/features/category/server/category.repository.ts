import { getDatabase } from "@/lib/db/client";
import {
  isUniqueViolation,
  placeholders,
  toEpochMilliseconds,
} from "@/lib/db/types";

import {
  CategoryNameTakenError,
  type Category,
  type CategoryUsage,
} from "../schema";

/** SQLite names a collated unique index, not its column, in the error. */
function isNameTaken(error: unknown): boolean {
  return (
    isUniqueViolation(error, "category.name") ||
    isUniqueViolation(error, "index 'category_name_uidx'")
  );
}

export function createCategoryRepository(db: D1Database) {
  async function guardName<T>(
    name: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (isNameTaken(error)) throw new CategoryNameTakenError(name);
      throw error;
    }
  }

  return {
    async insert(category: Category, now: Date): Promise<Category> {
      await guardName(category.name, () =>
        db
          .prepare(
            "INSERT INTO category (id, name, created_at) VALUES (?, ?, ?)",
          )
          .bind(category.id, category.name, toEpochMilliseconds(now))
          .run(),
      );

      return { id: category.id, name: category.name };
    },

    /** Returns null when the category does not exist. */
    async rename(id: string, name: string): Promise<Category | null> {
      return guardName(name, () =>
        db
          .prepare(
            "UPDATE category SET name = ? WHERE id = ? RETURNING id, name",
          )
          .bind(name, id)
          .first<Category>(),
      );
    },

    async findById(id: string): Promise<Category | null> {
      return db
        .prepare("SELECT id, name FROM category WHERE id = ?")
        .bind(id)
        .first<Category>();
    },

    /** In the order the owner created them. */
    async list(): Promise<Category[]> {
      const { results } = await db
        .prepare("SELECT id, name FROM category ORDER BY created_at, id")
        .all<Category>();

      return results;
    },

    /** Like `list`, with the number of non-deleted posts per category. */
    async listWithUsage(): Promise<CategoryUsage[]> {
      const { results } = await db
        .prepare(
          `SELECT category.id, category.name, count(post.id) AS posts
           FROM category
           LEFT JOIN post
             ON post.category_id = category.id AND post.deleted_at IS NULL
           GROUP BY category.id
           ORDER BY category.created_at, category.id`,
        )
        .all<CategoryUsage>();

      return results;
    },

    /** Categories by id, for a page of posts. Unknown ids are left out. */
    async listByIds(ids: readonly string[]): Promise<Map<string, Category>> {
      const unique = [...new Set(ids)];
      const byId = new Map<string, Category>();
      if (unique.length === 0) return byId;

      const { results } = await db
        .prepare(
          `SELECT id, name FROM category
           WHERE id IN (${placeholders(unique.length)})`,
        )
        .bind(...unique)
        .all<Category>();
      for (const row of results) byId.set(row.id, row);

      return byId;
    },

    /**
     * Deletes an unused category in one transaction. Soft-deleted posts let
     * go of it first, so only live posts keep it in use. `posts` counts the
     * live posts that blocked the delete.
     */
    async delete(id: string): Promise<{ deleted: boolean; posts: number }> {
      const [, removed, usage] = await db.batch<{ posts: number }>([
        db
          .prepare(
            `UPDATE post SET category_id = NULL
             WHERE category_id = ? AND deleted_at IS NOT NULL`,
          )
          .bind(id),
        db
          .prepare(
            `DELETE FROM category WHERE id = ?
               AND NOT EXISTS (SELECT 1 FROM post WHERE category_id = ?)`,
          )
          .bind(id, id),
        db
          .prepare(
            `SELECT count(*) AS posts FROM post
             WHERE category_id = ? AND deleted_at IS NULL`,
          )
          .bind(id),
      ]);

      return {
        deleted: (removed?.meta.changes ?? 0) > 0,
        posts: usage?.results[0]?.posts ?? 0,
      };
    },
  };
}

export type CategoryRepository = ReturnType<typeof createCategoryRepository>;

export async function getCategoryRepository(): Promise<CategoryRepository> {
  return createCategoryRepository(await getDatabase());
}
