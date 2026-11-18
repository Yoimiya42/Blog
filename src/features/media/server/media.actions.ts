"use server";

import { revalidatePath } from "next/cache";

import { requireOwner } from "@/features/auth";

import {
  getMediaService,
  type MediaLibraryItem,
  type MediaReference,
} from "./media.service";

const MEDIA_PATH = "/admin/media";

export type DeleteMediaState =
  | { kind: "idle" }
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
  return { kind: "idle" };
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
