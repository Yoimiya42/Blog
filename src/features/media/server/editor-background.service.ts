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

/** Where a view's values come from (ADR-0032). */
export type EditorBackgroundSource = "default" | "post";

/** What the edit view renders. `image` is null for no live background. */
export interface EditorBackgroundView {
  opacity: EditorBackgroundOpacity;
  image: {
    mediaId: string;
    src: string;
    srcSet: string;
    thumbnailUrl: string;
  } | null;
  source: EditorBackgroundSource;
}

export type EditorBackgroundUpdate = {
  /** `null` removes the image; absent keeps it. */
  mediaId?: string | null;
  opacity?: unknown;
};

export type EditorBackgroundResult =
  | { ok: true; background: EditorBackgroundView }
  | {
      ok: false;
      reason: "invalid_opacity" | "media_not_found" | "post_not_found";
    };

interface Dependencies {
  backgrounds: EditorBackgroundRepository;
  media: Pick<MediaRepository, "findDisplayByIds">;
  isOwner: (actor: BackgroundActor) => boolean;
  now?: () => Date;
}

function isForeignKeyViolation(error: unknown): boolean {
  return (
    error instanceof Error && error.message.includes("FOREIGN KEY constraint")
  );
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

  async function storedDefault(userId: string): Promise<EditorBackground> {
    return (await backgrounds.find(userId)) ?? DEFAULT_BACKGROUND;
  }

  async function toView(
    background: EditorBackground,
    source: EditorBackgroundSource,
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
      source,
    };
  }

  /**
   * Applies an untrusted update to `current`, or names why it is invalid.
   */
  async function merge(
    current: EditorBackground,
    update: EditorBackgroundUpdate,
  ): Promise<
    | { ok: true; background: EditorBackground }
    | { ok: false; reason: "invalid_opacity" | "media_not_found" }
  > {
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

    return { ok: true, background: { mediaId, opacity } };
  }

  return {
    /** The owner default (FR-ADMIN-27). */
    async getDefault(actor: BackgroundActor): Promise<EditorBackgroundView> {
      const userId = ownerId(actor);
      return toView(await storedDefault(userId), "default");
    },

    /** Merges `update` into the default. Inputs are untrusted. */
    async updateDefault(
      actor: BackgroundActor,
      update: EditorBackgroundUpdate,
    ): Promise<EditorBackgroundResult> {
      const userId = ownerId(actor);
      const merged = await merge(await storedDefault(userId), update);
      if (!merged.ok) return merged;

      const saved = await backgrounds.save(userId, merged.background, now());
      return { ok: true, background: await toView(saved, "default") };
    },

    /** The post's own choice, else the default (ADR-0032). */
    async getForPost(
      actor: BackgroundActor,
      postId: string,
    ): Promise<EditorBackgroundView> {
      const userId = ownerId(actor);
      const own = await backgrounds.findForPost(postId);
      return own
        ? toView(own, "post")
        : toView(await storedDefault(userId), "default");
    },

    /**
     * Stores a choice for one post, starting from what the post shows now.
     * `postId` is untrusted; an unknown post is reported, not created.
     */
    async updateForPost(
      actor: BackgroundActor,
      postId: string,
      update: EditorBackgroundUpdate,
    ): Promise<EditorBackgroundResult> {
      const userId = ownerId(actor);
      const current =
        (await backgrounds.findForPost(postId)) ??
        (await storedDefault(userId));
      const merged = await merge(current, update);
      if (!merged.ok) return merged;

      try {
        const saved = await backgrounds.saveForPost(
          postId,
          merged.background,
          now(),
        );
        return { ok: true, background: await toView(saved, "post") };
      } catch (error) {
        if (isForeignKeyViolation(error)) {
          return { ok: false, reason: "post_not_found" };
        }
        throw error;
      }
    },

    /** Drops the post's own choice; the post follows the default again. */
    async resetForPost(
      actor: BackgroundActor,
      postId: string,
    ): Promise<EditorBackgroundView> {
      const userId = ownerId(actor);
      await backgrounds.deleteForPost(postId);
      return toView(await storedDefault(userId), "default");
    },

    /** Media ids the default or any post uses, for the library flag. */
    async listMediaIdsInUse(actor: BackgroundActor): Promise<Set<string>> {
      const userId = ownerId(actor);
      return new Set(await backgrounds.listMediaIdsInUse(userId));
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
