/* eslint-disable @next/next/no-img-element -- Cloudflare Images serves fixed widths (ADR-0021); `srcset` picks among them. */

import type { ImageNode } from "../types";
import { ImageZoom } from "./image-zoom";
import type { ArticleMedia } from "./media";

/**
 * Rendered width of the article column: 44rem on the public page, 42rem in
 * the admin preview, the viewport minus gutters below that.
 */
export const ARTICLE_IMAGE_SIZES = "(min-width: 48rem) 44rem, 100vw";

export type ArticleImageProps = {
  node: ImageNode;
  media: ArticleMedia | undefined;
  /** The likely first-screen image loads eagerly; every other one lazily. */
  eager?: boolean;
};

export function ArticleImage({
  node,
  media,
  eager = false,
}: ArticleImageProps) {
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
      <ImageZoom
        alt={node.attrs.alt}
        height={media.height}
        src={media.zoomUrl ?? media.url}
        srcSet={media.srcSet}
        width={media.width}
      >
        <img
          alt={node.attrs.alt}
          decoding="async"
          fetchPriority={eager ? "high" : undefined}
          height={media.height}
          loading={eager ? "eager" : "lazy"}
          sizes={media.srcSet ? ARTICLE_IMAGE_SIZES : undefined}
          src={media.url}
          srcSet={media.srcSet}
          width={media.width}
        />
      </ImageZoom>
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}
