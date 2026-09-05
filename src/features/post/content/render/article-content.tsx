import type { ArticleDocument } from "../types";
import type { ArticleMediaMap } from "./media";
import { renderNodes } from "./registry";

export type ArticleContentProps = {
  document: ArticleDocument;
  mediaById: ArticleMediaMap;
};

export async function ArticleContent({
  document,
  mediaById,
}: ArticleContentProps) {
  const content = await renderNodes(document.content, { mediaById });

  return <article data-article-content="">{content}</article>;
}
