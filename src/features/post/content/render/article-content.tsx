import type { ArticleDocument } from "../types";
import { renderNodes } from "./registry";

export type ArticleContentProps = {
  document: ArticleDocument;
};

export async function ArticleContent({ document }: ArticleContentProps) {
  const content = await renderNodes(document.content);

  return <article data-article-content="">{content}</article>;
}
