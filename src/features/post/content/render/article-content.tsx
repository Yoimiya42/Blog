import type { ArticleDocument } from "../types";
import type { ArticleMediaMap } from "./media";
import { renderNodes } from "./registry";

export type ArticleContentProps = {
  document: ArticleDocument;
  mediaById: ArticleMediaMap;
};

/**
 * Top-level blocks that usually share the first screen with the title. An
 * image among them is likely the largest contentful paint, so lazy loading
 * would only delay it.
 */
const FIRST_SCREEN_BLOCKS = 3;

/** Path of a top-level image within the first screen, matching `renderNodes`. */
export function firstScreenImagePath(
  document: ArticleDocument,
): string | undefined {
  const index = document.content
    .slice(0, FIRST_SCREEN_BLOCKS)
    .findIndex((node) => node.type === "image");

  return index === -1 ? undefined : `article.${index}`;
}

export async function ArticleContent({
  document,
  mediaById,
}: ArticleContentProps) {
  const content = await renderNodes(document.content, {
    mediaById,
    eagerImagePath: firstScreenImagePath(document),
  });

  return <article data-article-content="">{content}</article>;
}
