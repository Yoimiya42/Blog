import type { PostRepository } from "./post.repository";

export interface MediaReferencingPost {
  id: string;
  title: string;
}

/**
 * Walks any stored document shape, including older schema versions, so a
 * reference is never missed because a post fails current validation.
 */
function referencesMedia(node: unknown, mediaId: string): boolean {
  if (typeof node !== "object" || node === null) return false;
  const { type, attrs, content } = node as {
    type?: unknown;
    attrs?: { mediaId?: unknown };
    content?: unknown;
  };
  if (type === "image" && attrs?.mediaId === mediaId) return true;

  return (
    Array.isArray(content) &&
    content.some((child) => referencesMedia(child, mediaId))
  );
}

/**
 * Non-deleted posts, drafts included, whose content or cover shows `mediaId`.
 */
export async function findPostsReferencingMedia(
  posts: Pick<PostRepository, "listContentSources">,
  mediaId: string,
): Promise<MediaReferencingPost[]> {
  const sources = await posts.listContentSources();

  return sources
    .filter(
      (post) =>
        post.coverId === mediaId || referencesMedia(post.content, mediaId),
    )
    .map(({ id, title }) => ({ id, title }));
}

/** Production wiring for the media module (ADR-0025). */
export async function getMediaReferenceFinder() {
  const { getPostRepository } = await import("./post.repository");
  const posts = await getPostRepository();

  return (mediaId: string) => findPostsReferencingMedia(posts, mediaId);
}
