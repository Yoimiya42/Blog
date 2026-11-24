import { getDatabase } from "@/lib/db/client";
import { toEpochMilliseconds } from "@/lib/db/types";

import { isEditorBackgroundOpacity, type EditorBackground } from "../schema";

interface EditorBackgroundRow {
  media_id: string | null;
  opacity: number;
}

function toBackground(row: EditorBackgroundRow): EditorBackground {
  if (!isEditorBackgroundOpacity(row.opacity)) {
    throw new Error(`unknown background opacity in database: ${row.opacity}`);
  }
  return { mediaId: row.media_id, opacity: row.opacity };
}

export function createEditorBackgroundRepository(db: D1Database) {
  return {
    async find(userId: string): Promise<EditorBackground | null> {
      const row = await db
        .prepare(
          "SELECT media_id, opacity FROM editor_background WHERE user_id = ?",
        )
        .bind(userId)
        .first<EditorBackgroundRow>();

      return row ? toBackground(row) : null;
    },

    async save(
      userId: string,
      background: EditorBackground,
      now: Date,
    ): Promise<EditorBackground> {
      const row = await db
        .prepare(
          `INSERT INTO editor_background (user_id, media_id, opacity, updated_at)
           VALUES (?, ?, ?, ?)
           ON CONFLICT (user_id) DO UPDATE SET
             media_id = excluded.media_id,
             opacity = excluded.opacity,
             updated_at = excluded.updated_at
           RETURNING media_id, opacity`,
        )
        .bind(
          userId,
          background.mediaId,
          background.opacity,
          toEpochMilliseconds(now),
        )
        .first<EditorBackgroundRow>();
      if (!row) throw new Error("editor background save returned no row");

      return toBackground(row);
    },

    /** A post's own choice, or null when it follows the default. */
    async findForPost(postId: string): Promise<EditorBackground | null> {
      const row = await db
        .prepare(
          "SELECT media_id, opacity FROM post_editor_background WHERE post_id = ?",
        )
        .bind(postId)
        .first<EditorBackgroundRow>();

      return row ? toBackground(row) : null;
    },

    /** Throws a FOREIGN KEY error when the post row does not exist. */
    async saveForPost(
      postId: string,
      background: EditorBackground,
      now: Date,
    ): Promise<EditorBackground> {
      const row = await db
        .prepare(
          `INSERT INTO post_editor_background (post_id, media_id, opacity, updated_at)
           VALUES (?, ?, ?, ?)
           ON CONFLICT (post_id) DO UPDATE SET
             media_id = excluded.media_id,
             opacity = excluded.opacity,
             updated_at = excluded.updated_at
           RETURNING media_id, opacity`,
        )
        .bind(
          postId,
          background.mediaId,
          background.opacity,
          toEpochMilliseconds(now),
        )
        .first<EditorBackgroundRow>();
      if (!row) throw new Error("post background save returned no row");

      return toBackground(row);
    },

    async deleteForPost(postId: string): Promise<void> {
      await db
        .prepare("DELETE FROM post_editor_background WHERE post_id = ?")
        .bind(postId)
        .run();
    },

    /** Media ids used by the user's default or by any post. */
    async listMediaIdsInUse(userId: string): Promise<string[]> {
      const { results } = await db
        .prepare(
          `SELECT media_id FROM editor_background
           WHERE user_id = ? AND media_id IS NOT NULL
           UNION
           SELECT media_id FROM post_editor_background
           WHERE media_id IS NOT NULL`,
        )
        .bind(userId)
        .all<{ media_id: string }>();

      return results.map((row) => row.media_id);
    },
  };
}

export type EditorBackgroundRepository = ReturnType<
  typeof createEditorBackgroundRepository
>;

export async function getEditorBackgroundRepository(): Promise<EditorBackgroundRepository> {
  return createEditorBackgroundRepository(await getDatabase());
}
