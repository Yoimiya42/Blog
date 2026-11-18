import type { StorageAdapter } from "@/lib/storage";

import { mediaUrl, type MediaWidth } from "../delivery";
import { MediaAccessDeniedError, type Media } from "../schema";
import { MediaRejectedError } from "../upload/errors";
import { MEDIA_FORMATS, processImage } from "../upload/process";
import type { MediaRepository } from "./media.repository";

export type MediaActor = { user: { role?: unknown } } | null | undefined;

export const MAX_ALT_LENGTH = 500;

/**
 * Article images load the 1600 px variant: sharp on a two-times display at the
 * article column width. Responsive sources arrive with Issue #64.
 */
export const ARTICLE_IMAGE_WIDTH: MediaWidth = 1600;

const ID_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const ID_LENGTH = 20;

/**
 * 20 characters from [a-z0-9], about 103 bits. Matches the public URL pattern
 * in `delivery.ts`; an unguessable id is the only access control on v1 media
 * (ADR-0022).
 */
export function newMediaId(): string {
  let id = "";
  while (id.length < ID_LENGTH) {
    for (const byte of crypto.getRandomValues(new Uint8Array(ID_LENGTH))) {
      // 252 is the largest multiple of 36 below 256: no modulo bias.
      if (byte < 252 && id.length < ID_LENGTH) id += ID_ALPHABET[byte % 36];
    }
  }
  return id;
}

/** What an article renderer needs for one image. */
export interface ResolvedMedia {
  url: string;
  width: number;
  height: number;
}

interface MediaServiceDependencies {
  media: MediaRepository;
  storage: StorageAdapter;
  isOwner: (actor: MediaActor) => boolean;
  now?: () => Date;
  newId?: () => string;
}

export function createMediaService({
  media,
  storage,
  isOwner,
  now = () => new Date(),
  newId = newMediaId,
}: MediaServiceDependencies) {
  return {
    /**
     * Validates the file, removes location data, stores the GPS-clean
     * original, and records it. `bytes` is modified in place and must not be
     * reused. Throws MediaRejectedError for files the owner must fix.
     */
    async upload(
      actor: MediaActor,
      bytes: Uint8Array,
      alt = "",
    ): Promise<Media> {
      if (!isOwner(actor)) throw new MediaAccessDeniedError();

      const trimmedAlt = alt.trim();
      if (trimmedAlt.length > MAX_ALT_LENGTH) {
        throw new MediaRejectedError("alt_too_long");
      }

      const image = processImage(bytes);
      const { mimeType, extension } = MEDIA_FORMATS[image.format];
      const id = newId();
      const storageKey = `media/${id}.${extension}`;

      await storage.upload({
        body: image.bytes,
        key: storageKey,
        contentType: mimeType,
      });

      let created: Media;
      try {
        created = await media.insert(
          {
            id,
            storageKey,
            mimeType,
            width: image.width,
            height: image.height,
            sizeBytes: image.bytes.length,
            alt: trimmedAlt,
            gpsLatitude: image.gps?.latitude ?? null,
            gpsLongitude: image.gps?.longitude ?? null,
          },
          now(),
        );
      } catch (error) {
        // An object without a row is unreachable; remove it.
        await storage.delete(storageKey).catch((cleanupError: unknown) => {
          console.error(
            JSON.stringify({
              event: "media.orphan",
              storageKey,
              error: String(cleanupError),
            }),
          );
        });
        throw error;
      }

      // Coordinates are never logged.
      console.info(
        JSON.stringify({
          event: "media.upload",
          mediaId: id,
          mimeType,
          sizeBytes: created.sizeBytes,
          hadGps: image.gps !== null,
        }),
      );

      return created;
    },

    /** Public read for article rendering. Unknown or deleted ids are absent. */
    async resolveForArticle(
      ids: readonly string[],
    ): Promise<Record<string, ResolvedMedia>> {
      if (ids.length === 0) return {};

      const found = await media.findDisplayByIds(ids);
      return Object.fromEntries(
        found.map((item) => [
          item.id,
          {
            url: mediaUrl(item.storageKey, ARTICLE_IMAGE_WIDTH),
            width: item.width,
            height: item.height,
          },
        ]),
      );
    },

    /** For article validation: which ids name live media. */
    findExisting(ids: string[]): Promise<Set<string>> {
      return media.findExisting(ids);
    },
  };
}

export type MediaService = ReturnType<typeof createMediaService>;

export async function getMediaService(): Promise<MediaService> {
  // Loaded lazily: the repository, storage, and auth module need the Workers
  // runtime.
  const [{ getMediaRepository }, { getMediaStorage }, { isOwnerSession }] =
    await Promise.all([
      import("./media.repository"),
      import("@/lib/storage"),
      import("@/features/auth"),
    ]);

  return createMediaService({
    media: await getMediaRepository(),
    storage: await getMediaStorage(),
    isOwner: isOwnerSession,
  });
}
