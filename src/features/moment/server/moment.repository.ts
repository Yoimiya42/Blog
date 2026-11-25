import { getDatabase } from "@/lib/db/client";
import {
  fromEpochMilliseconds,
  toEpochMilliseconds,
  type EpochMilliseconds,
} from "@/lib/db/types";

import { MOMENT_MAX_IMAGES, type Moment, type NewMoment } from "../schema";

interface MomentRow {
  id: string;
  body: string;
  /** JSON array of media ids in position order. */
  media_ids: string;
  created_at: EpochMilliseconds;
  updated_at: EpochMilliseconds;
}

// One query per page: the ordered image ids come back as a JSON array.
const MOMENT_COLUMNS = `id, body, created_at, updated_at,
  (SELECT json_group_array(media_id) FROM (
     SELECT media_id FROM moment_media
     WHERE moment_id = moment.id
     ORDER BY position
   )) AS media_ids`;

function toMoment(row: MomentRow): Moment {
  return {
    id: row.id,
    body: row.body,
    mediaIds: JSON.parse(row.media_ids) as string[],
    createdAt: fromEpochMilliseconds(row.created_at),
    updatedAt: fromEpochMilliseconds(row.updated_at),
  };
}

export interface MomentReferenceRow {
  id: string;
  body: string;
  createdAt: Date;
}

export function createMomentRepository(db: D1Database) {
  /**
   * Statements that replace the image list of a moment when `guard` holds.
   * Plain VALUES rows, so an unknown media id fails the foreign key and rolls
   * back the surrounding batch instead of being dropped.
   */
  function mediaReplacement(
    momentId: string,
    mediaIds: readonly string[],
    guard: { sql: string; values: (string | number)[] } = {
      sql: "1",
      values: [],
    },
  ): D1PreparedStatement[] {
    if (mediaIds.length > MOMENT_MAX_IMAGES) {
      throw new RangeError(
        `too many images for one moment: ${mediaIds.length}`,
      );
    }

    const statements = [
      db
        .prepare(
          `DELETE FROM moment_media WHERE moment_id = ? AND ${guard.sql}`,
        )
        .bind(momentId, ...guard.values),
    ];
    if (mediaIds.length > 0) {
      statements.push(
        db
          .prepare(
            `INSERT INTO moment_media (moment_id, media_id, position)
             SELECT column1, column2, column3
             FROM (VALUES ${mediaIds.map(() => "(?, ?, ?)").join(", ")})
             WHERE ${guard.sql}`,
          )
          .bind(
            ...mediaIds.flatMap((mediaId, position) => [
              momentId,
              mediaId,
              position,
            ]),
            ...guard.values,
          ),
      );
    }

    return statements;
  }

  async function findLive(id: string): Promise<Moment | null> {
    const row = await db
      .prepare(
        `SELECT ${MOMENT_COLUMNS} FROM moment
         WHERE id = ? AND deleted_at IS NULL`,
      )
      .bind(id)
      .first<MomentRow>();

    return row ? toMoment(row) : null;
  }

  return {
    /** The moment and its images are written in one batch transaction. */
    async insert(moment: NewMoment, now: Date): Promise<Moment> {
      const timestamp = toEpochMilliseconds(now);
      await db.batch([
        db
          .prepare(
            `INSERT INTO moment (id, body, created_at, updated_at)
             VALUES (?, ?, ?, ?)`,
          )
          .bind(moment.id, moment.body, timestamp, timestamp),
        ...mediaReplacement(moment.id, moment.mediaIds),
      ]);

      const created = await findLive(moment.id);
      if (!created) throw new Error("moment insert returned no row");

      return created;
    },

    /**
     * Replaces the body and images. Returns null when the moment does not
     * exist, is deleted, or no longer has the `updatedAt` the caller read; in
     * that case neither the body nor the images change.
     */
    async update(
      id: string,
      change: { body: string; mediaIds: readonly string[] },
      now: Date,
      ifUpdatedAt: Date,
    ): Promise<Moment | null> {
      const filter = "id = ? AND deleted_at IS NULL AND updated_at = ?";
      const filterValues = [id, toEpochMilliseconds(ifUpdatedAt)];
      // The image statements run first and test the same filter against the
      // pre-update row, so all statements apply or none does.
      const guard = {
        sql: `EXISTS (SELECT 1 FROM moment WHERE ${filter})`,
        values: filterValues,
      };

      const results = await db.batch<{ id: string }>([
        ...mediaReplacement(id, change.mediaIds, guard),
        db
          .prepare(
            // Strictly increasing, so the token changes even when two writes
            // land in the same millisecond.
            `UPDATE moment SET body = ?, updated_at = max(?, updated_at + 1)
             WHERE ${filter}
             RETURNING id`,
          )
          .bind(change.body, toEpochMilliseconds(now), ...filterValues),
      ]);
      if (!results.at(-1)?.results[0]) return null;

      return findLive(id);
    },

    findById: findLive,

    /** Live moments, newest first. */
    async list(limit: number, offset: number): Promise<Moment[]> {
      const { results } = await db
        .prepare(
          `SELECT ${MOMENT_COLUMNS} FROM moment
           WHERE deleted_at IS NULL
           ORDER BY created_at DESC, id DESC
           LIMIT ? OFFSET ?`,
        )
        .bind(limit, offset)
        .all<MomentRow>();

      return results.map(toMoment);
    },

    async count(): Promise<number> {
      const row = await db
        .prepare(
          "SELECT count(*) AS total FROM moment WHERE deleted_at IS NULL",
        )
        .first<{ total: number }>();

      return row?.total ?? 0;
    },

    /** Returns false when the moment does not exist or is already deleted. */
    async softDelete(id: string, now: Date): Promise<boolean> {
      const timestamp = toEpochMilliseconds(now);
      const result = await db
        .prepare(
          `UPDATE moment SET deleted_at = ?, updated_at = max(?, updated_at + 1)
           WHERE id = ? AND deleted_at IS NULL`,
        )
        .bind(timestamp, timestamp, id)
        .run();

      return result.meta.changes > 0;
    },

    /** Live moments that show `mediaId`, newest first (ADR-0025). */
    async listReferencing(mediaId: string): Promise<MomentReferenceRow[]> {
      const { results } = await db
        .prepare(
          `SELECT DISTINCT moment.id, moment.body, moment.created_at
           FROM moment
           JOIN moment_media ON moment_media.moment_id = moment.id
           WHERE moment_media.media_id = ? AND moment.deleted_at IS NULL
           ORDER BY moment.created_at DESC, moment.id DESC`,
        )
        .bind(mediaId)
        .all<{ id: string; body: string; created_at: EpochMilliseconds }>();

      return results.map((row) => ({
        id: row.id,
        body: row.body,
        createdAt: fromEpochMilliseconds(row.created_at),
      }));
    },
  };
}

export type MomentRepository = ReturnType<typeof createMomentRepository>;

export async function getMomentRepository(): Promise<MomentRepository> {
  return createMomentRepository(await getDatabase());
}
