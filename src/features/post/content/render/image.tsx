/* eslint-disable @next/next/no-img-element -- Issue #14 owns the responsive image pipeline. */

import type { ImageNode } from "../types";
import type { ArticleMedia } from "./media";

export type ArticleImageProps = {
  node: ImageNode;
  media: ArticleMedia | undefined;
};

export function ArticleImage({ node, media }: ArticleImageProps) {
  if (!media) {
    console.error("Article image media is unavailable.", node.attrs.mediaId);

    return (
      <figure data-media-id={node.attrs.mediaId}>
        <div role="note">Image unavailable.</div>
      </figure>
    );
  }

  const caption = node.attrs.caption?.trim();

  return (
    <figure data-media-id={node.attrs.mediaId}>
      <img
        alt={node.attrs.alt}
        decoding="async"
        height={media.height}
        loading="lazy"
        src={media.url}
        width={media.width}
      />
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}
