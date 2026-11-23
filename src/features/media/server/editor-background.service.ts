import {
  coveringWidth,
  mediaSrcSet,
  mediaUrl,
  type MediaWidth,
} from "../delivery";
import {
  isEditorBackgroundOpacity,
  MediaAccessDeniedError,
  type EditorBackground,
  type EditorBackgroundOpacity,
} from "../schema";
import type { EditorBackgroundRepository } from "./editor-background.repository";
import type { MediaRepository } from "./media.repository";
import { THUMBNAIL_WIDTH } from "./media.service";

export type BackgroundActor =
  { user: { id: string; role?: unknown } } | null | undefined;

/** A first choice starts half visible: readable glass, a clear image. */
export const DEFAULT_BACKGROUND: EditorBackground = {
  mediaId: null,
  opacity: 50,
};

/** Fallback `src` for browsers that ignore `srcset`. */
const BACKGROUND_FALLBACK_WIDTH: MediaWidth = 1600;

/** What the edit view renders. `image` is null for no live background. */
export interface EditorBackgroundView {
  opacity: EditorBackgroundOpacity;
  image: {
    mediaId: string;
    src: string;
    srcSet: string;
    thumbnailUrl: string;
  } | null;
}

export type EditorBackgroundUpdate = {
  /** `null` removes the image; absent keeps it. */
  mediaId?: string | null;
  opacity?: unknown;
};

export type EditorBackgroundResult =
  | { ok: true; background: EditorBackgroundView }
  | { ok: false; reason: "invalid_opacity" | "media_not_found" };

interface Dependencies {
  backgrounds: EditorBackgroundRepository;
  media: Pick<MediaRepository, "findDisplayByIds">;
  isOwner: (actor: BackgroundActor) => boolean;
  now?: () => Date;
}

export function createEditorBackgroundService({
  backgrounds,
  media,
  isOwner,
  now = () => new Date(),
}: Dependencies) {
  function ownerId(actor: BackgroundActor): string {
    if (!actor || !isOwner(actor)) throw new MediaAccessDeniedError();
    return actor.user.id;
  }

  async function toView(
    background: EditorBackground,
  ): Promise<EditorBackgroundView> {
    // A deleted image no longer resolves; the editor shows the plain canvas.
    const [item] = background.mediaId
      ? await media.findDisplayByIds([background.mediaId])
      : [];

    return {
      opacity: background.opacity,
      image: item
        ? {
            mediaId: item.id,
            src: mediaUrl(
              item.storageKey,
              Math.min(
                BACKGROUND_FALLBACK_WIDTH,
                coveringWidth(item.width),
              ) as MediaWidth,
            ),
            srcSet: mediaSrcSet(item.storageKey, item.width),
            thumbnailUrl: mediaUrl(item.storageKey, THUMBNAIL_WIDTH),
          }
        : null,
    };
  }

  return {
    async get(actor: BackgroundActor): Promise<EditorBackgroundView> {
      const userId = ownerId(actor);
      return toView((await backgrounds.find(userId)) ?? DEFAULT_BACKGROUND);
    },

    /** Merges `update` into the stored choice. Inputs are untrusted. */
    async update(
      actor: BackgroundActor,
      update: EditorBackgroundUpdate,
    ): Promise<EditorBackgroundResult> {
      const userId = ownerId(actor);
      const current = (await backgrounds.find(userId)) ?? DEFAULT_BACKGROUND;

      const opacity =
        update.opacity === undefined ? current.opacity : update.opacity;
      if (!isEditorBackgroundOpacity(opacity)) {
        return { ok: false, reason: "invalid_opacity" };
      }

      let mediaId = current.mediaId;
      if (update.mediaId !== undefined) {
        if (update.mediaId !== null) {
          if (typeof update.mediaId !== "string") {
            return { ok: false, reason: "media_not_found" };
          }
          const [live] = await media.findDisplayByIds([update.mediaId]);
          if (!live) return { ok: false, reason: "media_not_found" };
        }
        mediaId = update.mediaId;
      }

      const saved = await backgrounds.save(userId, { mediaId, opacity }, now());
      return { ok: true, background: await toView(saved) };
    },
  };
}

export type EditorBackgroundService = ReturnType<
  typeof createEditorBackgroundService
>;

export async function getEditorBackgroundService(): Promise<EditorBackgroundService> {
  // Loaded lazily, like the media service: these need the Workers runtime.
  const [
    { getEditorBackgroundRepository },
    { getMediaRepository },
    { isOwnerSession },
  ] = await Promise.all([
    import("./editor-background.repository"),
    import("./media.repository"),
    import("@/features/auth"),
  ]);

  return createEditorBackgroundService({
    backgrounds: await getEditorBackgroundRepository(),
    media: await getMediaRepository(),
    isOwner: isOwnerSession,
  });
}
