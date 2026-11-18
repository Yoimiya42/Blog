import { getDatabase } from "@/lib/db/client";
import {
  fromEpochMilliseconds,
  MAX_BOUND_PARAMETERS,
  placeholders,
  toEpochMilliseconds,
  type EpochMilliseconds,
} from "@/lib/db/types";

import type { Media, MediaDisplay, MediaMimeType, NewMedia } from "../schema";

interface MediaRow {
  id: string;
  storage_key: string;
  mime_type: string;
  width: number;
  height: number;
  size_bytes: number;
  alt: string;
  gps_latitude: number | null;
  gps_longitude: number | null;
  created_at: EpochMilliseconds;
  updated_at: EpochMilliseconds;
}

type DisplayRow = Pick<MediaRow, "id" | "storage_key" | "width" | "height">;

const MEDIA_COLUMNS =
  "id, storage_key, mime_type, width, height, size_bytes, alt, gps_latitude, gps_longitude, created_at, updated_at";
// Public reads never select the coordinates.
const DISPLAY_COLUMNS = "id, storage_key, width, height";

const MIME_TYPES: readonly MediaMimeType[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

function toMimeType(value: string): MediaMimeType {
  if ((MIME_TYPES as readonly string[]).includes(value)) {
    return value as MediaMimeType;
  }
  throw new Error(`unknown media type in database: ${value}`);
}

function toMedia(row: MediaRow): Media {
  return {
    id: row.id,
    storageKey: row.storage_key,
    mimeType: toMimeType(row.mime_type),
    width: row.width,
    height: row.height,
    sizeBytes: row.size_bytes,
    alt: row.alt,
    gpsLatitude: row.gps_latitude,
    gpsLongitude: row.gps_longitude,
    createdAt: fromEpochMilliseconds(row.created_at),
    updatedAt: fromEpochMilliseconds(row.updated_at),
  };
}

function toDisplay(row: DisplayRow): MediaDisplay {
  return {
    id: row.id,
    storageKey: row.storage_key,
    width: row.width,
    height: row.height,
  };
}

function chunks<T>(items: readonly T[]): T[][] {
  const result: T[][] = [];
  for (let at = 0; at < items.length; at += MAX_BOUND_PARAMETERS) {
    result.push(items.slice(at, at + MAX_BOUND_PARAMETERS));
  }
  return result;
}

export function createMediaRepository(db: D1Database) {
  async function displayByIds(ids: readonly string[]) {
    const rows: DisplayRow[] = [];
    for (const batch of chunks([...new Set(ids)])) {
      const { results } = await db
        .prepare(
          `SELECT ${DISPLAY_COLUMNS} FROM media
           WHERE deleted_at IS NULL AND id IN (${placeholders(batch.length)})`,
        )
        .bind(...batch)
        .all<DisplayRow>();
      rows.push(...results);
    }
    return rows.map(toDisplay);
  }

  return {
    async insert(media: NewMedia, now: Date): Promise<Media> {
      const timestamp = toEpochMilliseconds(now);
      const row = await db
        .prepare(
          `INSERT INTO media (${MEDIA_COLUMNS})
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           RETURNING ${MEDIA_COLUMNS}`,
        )
        .bind(
          media.id,
          media.storageKey,
          media.mimeType,
          media.width,
          media.height,
          media.sizeBytes,
          media.alt,
          media.gpsLatitude,
          media.gpsLongitude,
          timestamp,
          timestamp,
        )
        .first<MediaRow>();
      if (!row) throw new Error("media insert returned no row");

      return toMedia(row);
    },

    async findById(id: string): Promise<Media | null> {
      const row = await db
        .prepare(
          `SELECT ${MEDIA_COLUMNS} FROM media
           WHERE id = ? AND deleted_at IS NULL`,
        )
        .bind(id)
        .first<MediaRow>();

      return row ? toMedia(row) : null;
    },

    /** Live media among `ids`, without coordinates. Missing ids are skipped. */
    findDisplayByIds: displayByIds,

    async findExisting(ids: readonly string[]): Promise<Set<string>> {
      return new Set((await displayByIds(ids)).map((media) => media.id));
    },

    /**
     * Ids among `ids` that were ever stored, deleted ones included: a post
     * that still shows a deleted image must stay saveable (ADR-0025).
     */
    async findKnown(ids: readonly string[]): Promise<Set<string>> {
      const known = new Set<string>();
      for (const batch of chunks([...new Set(ids)])) {
        const { results } = await db
          .prepare(
            `SELECT id FROM media WHERE id IN (${placeholders(batch.length)})`,
          )
          .bind(...batch)
          .all<{ id: string }>();
        for (const row of results) known.add(row.id);
      }
      return known;
    },

    /** Live media, newest first. */
    async listAll(): Promise<Media[]> {
      const { results } = await db
        .prepare(
          `SELECT ${MEDIA_COLUMNS} FROM media
           WHERE deleted_at IS NULL
           ORDER BY created_at DESC, id DESC`,
        )
        .all<MediaRow>();

      return results.map(toMedia);
    },

    /**
     * Marks the row deleted and clears its coordinates. Returns the storage
     * key, or null when the item is missing or already deleted.
     */
    async markDeleted(id: string, now: Date): Promise<string | null> {
      const timestamp = toEpochMilliseconds(now);
      const row = await db
        .prepare(
          `UPDATE media
           SET deleted_at = ?, updated_at = ?,
             gps_latitude = NULL, gps_longitude = NULL
           WHERE id = ? AND deleted_at IS NULL
           RETURNING storage_key`,
        )
        .bind(timestamp, timestamp, id)
        .first<{ storage_key: string }>();

      return row?.storage_key ?? null;
    },
  };
}

export type MediaRepository = ReturnType<typeof createMediaRepository>;

export async function getMediaRepository(): Promise<MediaRepository> {
  return createMediaRepository(await getDatabase());
}
