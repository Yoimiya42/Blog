import type { StorageAdapter } from "@/lib/storage";

import {
  coveringWidth,
  mediaSrcSet,
  mediaUrl,
  type MediaWidth,
} from "../delivery";
import { MediaAccessDeniedError, type Media } from "../schema";
import { MediaRejectedError } from "../upload/errors";
import { MEDIA_FORMATS, processImage } from "../upload/process";
import type { MediaRepository } from "./media.repository";

export type MediaActor = { user: { role?: unknown } } | null | undefined;

export const MAX_ALT_LENGTH = 500;

/**
 * Fallback `src` for article images: sharp on a two-times display at the
 * article column width. Browsers with `srcset` pick their own variant.
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

/** The library grid loads the smallest variant. */
export const THUMBNAIL_WIDTH: MediaWidth = 480;

/** One row of the owner's media library. Coordinates are reduced to a flag. */
export interface MediaLibraryItem {
  id: string;
  /** Root-relative article-width URL; the one inserted and copied. */
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
  mimeType: Media["mimeType"];
  alt: string;
  hadLocation: boolean;
  createdAt: Date;
}

/** A post or moment that shows a media item (ADR-0025, ADR-0036). */
export interface MediaReference {
  id: string;
  title: string;
  /** Admin page that edits the referencing item. */
  href: string;
}

export type MediaRemoval =
  | { kind: "deleted" }
  | { kind: "not_found" }
  /** Nothing was deleted; the owner must confirm with `confirmReferenced`. */
  | { kind: "referenced"; posts: MediaReference[] };

function toLibraryItem(item: Media): MediaLibraryItem {
  return {
    id: item.id,
    url: mediaUrl(item.storageKey, ARTICLE_IMAGE_WIDTH),
    thumbnailUrl: mediaUrl(item.storageKey, THUMBNAIL_WIDTH),
    width: item.width,
    height: item.height,
    sizeBytes: item.sizeBytes,
    mimeType: item.mimeType,
    alt: item.alt,
    hadLocation: item.gpsLatitude !== null,
    createdAt: item.createdAt,
  };
}

/**
 * Fallback `src` for list covers (FR-BLOG-14). The widest card is the lead
 * cover at about 26rem, so 960 is sharp on a two-times display.
 */
export const COVER_IMAGE_WIDTH: MediaWidth = 960;

/** What a list card or admin row needs for one post cover. */
export interface ResolvedCover {
  url: string;
  srcSet: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  alt: string;
}

/**
 * Fallback `src` for moment grid images (FR-MOMENT-02). A single image fills
 * the feed column at about 36rem, so 960 is sharp on a two-times display.
 */
export const MOMENT_IMAGE_WIDTH: MediaWidth = 960;

/** What the moment feed needs for one image. */
export interface ResolvedMomentImage {
  url: string;
  srcSet: string;
  /** Largest useful variant, for the enlarged view. */
  zoomUrl: string;
  width: number;
  height: number;
  alt: string;
}

/** What an article renderer needs for one image. */
export interface ResolvedMedia {
  url: string;
  /** Every allowed variant up to the one that covers the original. */
  srcSet: string;
  /** Largest useful variant, for the enlarged view and no-script link. */
  zoomUrl: string;
  width: number;
  height: number;
}

interface MediaServiceDependencies {
  media: MediaRepository;
  storage: StorageAdapter;
  isOwner: (actor: MediaActor) => boolean;
  /** Posts and moments that show a media id (ADR-0025, ADR-0036). */
  findReferences: (mediaId: string) => Promise<MediaReference[]>;
  now?: () => Date;
  newId?: () => string;
}

export function createMediaService({
  media,
  storage,
  isOwner,
  findReferences,
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
            url: mediaUrl(
              item.storageKey,
              Math.min(
                ARTICLE_IMAGE_WIDTH,
                coveringWidth(item.width),
              ) as MediaWidth,
            ),
            srcSet: mediaSrcSet(item.storageKey, item.width),
            zoomUrl: mediaUrl(item.storageKey, coveringWidth(item.width)),
            width: item.width,
            height: item.height,
          },
        ]),
      );
    },

    /** Public read for list covers. Unknown or deleted ids are absent. */
    async resolveCovers(
      ids: readonly string[],
    ): Promise<Record<string, ResolvedCover>> {
      if (ids.length === 0) return {};

      const found = await media.findDisplayByIds(ids);
      return Object.fromEntries(
        found.map((item) => [
          item.id,
          {
            url: mediaUrl(
              item.storageKey,
              Math.min(
                COVER_IMAGE_WIDTH,
                coveringWidth(item.width),
              ) as MediaWidth,
            ),
            srcSet: mediaSrcSet(item.storageKey, item.width),
            thumbnailUrl: mediaUrl(item.storageKey, THUMBNAIL_WIDTH),
            width: item.width,
            height: item.height,
            alt: item.alt,
          },
        ]),
      );
    },

    /** Public read for the moment feed. Unknown or deleted ids are absent. */
    async resolveForMoments(
      ids: readonly string[],
    ): Promise<Record<string, ResolvedMomentImage>> {
      if (ids.length === 0) return {};

      const found = await media.findDisplayByIds(ids);
      return Object.fromEntries(
        found.map((item) => [
          item.id,
          {
            url: mediaUrl(
              item.storageKey,
              Math.min(
                MOMENT_IMAGE_WIDTH,
                coveringWidth(item.width),
              ) as MediaWidth,
            ),
            srcSet: mediaSrcSet(item.storageKey, item.width),
            zoomUrl: mediaUrl(item.storageKey, coveringWidth(item.width)),
            width: item.width,
            height: item.height,
            alt: item.alt,
          },
        ]),
      );
    },

    /** For publishing: which ids name live media. */
    findExisting(ids: string[]): Promise<Set<string>> {
      return media.findExisting(ids);
    },

    /** For saving: which ids were ever stored, deleted ones included. */
    findKnown(ids: string[]): Promise<Set<string>> {
      return media.findKnown(ids);
    },

    /** The owner's library, newest first. */
    async list(actor: MediaActor): Promise<MediaLibraryItem[]> {
      if (!isOwner(actor)) throw new MediaAccessDeniedError();

      return (await media.listAll()).map(toLibraryItem);
    },

    /**
     * Deletes an item unless a post shows it and the owner has not confirmed.
     * The object goes first (ADR-0033): `/media` reads R2 without D1, so a
     * marked row over a surviving object would leave the image public. R2
     * deletes are idempotent, so either failure throws and leaves a live row
     * that the same request deletes on retry.
     */
    async remove(
      actor: MediaActor,
      id: string,
      { confirmReferenced = false } = {},
    ): Promise<MediaRemoval> {
      if (!isOwner(actor)) throw new MediaAccessDeniedError();

      const item = await media.findById(id);
      if (!item) return { kind: "not_found" };

      const posts = await findReferences(id);
      if (posts.length > 0 && !confirmReferenced) {
        return { kind: "referenced", posts };
      }

      await storage.delete(item.storageKey);
      if ((await media.markDeleted(id, now())) === null) {
        return { kind: "not_found" };
      }

      console.info(
        JSON.stringify({
          event: "media.delete",
          mediaId: id,
          referencedBy: posts.length,
        }),
      );

      return { kind: "deleted" };
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
    // Loaded only on delete: the post and moment modules own their content,
    // and the upload path in the Worker entry must not pull in their
    // components.
    findReferences: async (mediaId) => {
      const [{ getMediaReferenceFinder }, { getMomentService }] =
        await Promise.all([
          import("@/features/post"),
          import("@/features/moment"),
        ]);
      const [posts, moments] = await Promise.all([
        getMediaReferenceFinder().then((find) => find(mediaId)),
        getMomentService().then((service) =>
          service.findReferencingMedia(mediaId),
        ),
      ]);

      return [
        ...posts.map((post) => ({ ...post, href: `/admin/posts/${post.id}` })),
        ...moments,
      ];
    },
  });
}
