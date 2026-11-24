"use server";

import { revalidatePath } from "next/cache";

import { requireOwner } from "@/features/auth";

import {
  getEditorBackgroundService,
  type EditorBackgroundResult,
  type EditorBackgroundService,
  type EditorBackgroundView,
} from "./editor-background.service";
import {
  getMediaService,
  type MediaLibraryItem,
  type MediaReference,
} from "./media.service";

const MEDIA_PATH = "/admin/media";

export type DeleteMediaState =
  | { kind: "idle" }
  | { kind: "deleted" }
  | { kind: "referenced"; posts: MediaReference[] }
  | { kind: "error"; message: string };

/** What the editor picker needs per item. Serialisable across the action. */
export type MediaPickerItem = Pick<
  MediaLibraryItem,
  "id" | "url" | "thumbnailUrl" | "alt" | "width" | "height"
>;

/**
 * `mediaId` and `confirmReferenced` are bound on the client, so they are
 * untrusted: the service decides what exists and what is referenced. The
 * previous state and form data that `useActionState` appends are unused.
 */
export async function deleteMediaAction(
  mediaId: string,
  confirmReferenced: boolean,
): Promise<DeleteMediaState> {
  const session = await requireOwner();
  const service = await getMediaService();

  let result;
  try {
    result = await service.remove(session, mediaId, { confirmReferenced });
  } catch (error) {
    console.error(
      JSON.stringify({ event: "media.delete_failed", error: String(error) }),
    );
    return { kind: "error", message: "The delete failed. Try again." };
  }

  if (result.kind === "referenced") {
    return { kind: "referenced", posts: result.posts };
  }

  // A deleted or already missing item leaves the list either way.
  revalidatePath(MEDIA_PATH);
  if (confirmReferenced) {
    // Public posts that showed the image now render it as unavailable.
    revalidatePath("/");
    revalidatePath("/blog", "layout");
  }
  return { kind: "deleted" };
}

/** Library contents for the editor's image picker. */
export async function listMediaForPickerAction(): Promise<MediaPickerItem[]> {
  const session = await requireOwner();
  const items = await (await getMediaService()).list(session);

  return items.map(({ id, url, thumbnailUrl, alt, width, height }) => ({
    id,
    url,
    thumbnailUrl,
    alt,
    width,
    height,
  }));
}

export type EditorBackgroundActionResult =
  | { ok: true; background: EditorBackgroundView }
  | { ok: false; message: string };

const BACKGROUND_MESSAGES = {
  invalid_opacity: "That visibility level is not available.",
  media_not_found: "That image is no longer in the library.",
  post_not_found: "This post no longer exists.",
} as const;

const BACKGROUND_FAILED = "The background was not saved. Try again.";

type BackgroundUpdateInput = { mediaId?: string | null; opacity?: number };

/**
 * Shared shell for the background actions: owner guard, service call, and a
 * logged generic failure. No path is revalidated: the editor already shows the
 * result, and a refresh would re-render the open post form.
 */
async function runBackgroundAction(
  run: (
    service: EditorBackgroundService,
    session: Awaited<ReturnType<typeof requireOwner>>,
  ) => Promise<EditorBackgroundResult>,
): Promise<EditorBackgroundActionResult> {
  const session = await requireOwner();
  const service = await getEditorBackgroundService();

  try {
    const result = await run(service, session);
    return result.ok
      ? result
      : { ok: false, message: BACKGROUND_MESSAGES[result.reason] };
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "media.background_failed",
        error: String(error),
      }),
    );
    return { ok: false, message: BACKGROUND_FAILED };
  }
}

/**
 * Saves the owner default (FR-ADMIN-27). The argument comes from the client
 * and is untrusted; the service validates the tier and the image.
 */
export async function updateDefaultEditorBackgroundAction(
  update: BackgroundUpdateInput,
): Promise<EditorBackgroundActionResult> {
  return runBackgroundAction((service, session) =>
    service.updateDefault(session, {
      mediaId: update.mediaId,
      opacity: update.opacity,
    }),
  );
}

/**
 * Saves one post's own background (FR-ADMIN-26, ADR-0032). The page binds
 * `postId`; both arguments are untrusted.
 */
export async function updatePostEditorBackgroundAction(
  postId: string,
  update: BackgroundUpdateInput,
): Promise<EditorBackgroundActionResult> {
  return runBackgroundAction((service, session) =>
    service.updateForPost(session, String(postId), {
      mediaId: update.mediaId,
      opacity: update.opacity,
    }),
  );
}

/** Returns one post to the owner default. `postId` is bound by the page. */
export async function resetPostEditorBackgroundAction(
  postId: string,
): Promise<EditorBackgroundActionResult> {
  return runBackgroundAction(async (service, session) => ({
    ok: true,
    background: await service.resetForPost(session, String(postId)),
  }));
}
