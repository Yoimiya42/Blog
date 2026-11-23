import type {
  BlockNode,
  InlineNode,
  ListItemNode,
  HeadingLevel,
  CodeBlockNode,
  ImageNode,
  ArticleDocument,
} from "./types";

function deriveInlineContent(inlineNodes: readonly InlineNode[]): string {
  return inlineNodes
    .map((node) => {
      switch (node.type) {
        case "text":
          return node.text;
        case "hardBreak":
          return "\n";
      }
    })
    .join("");
}

function deriveCodeBlockContent(codeBlockNode: CodeBlockNode): string {
  return codeBlockNode.content?.map((line) => line.text).join("") ?? "";
}

function hasVisibleText(text: string): boolean {
  return text.trim().length > 0;
}

function deriveListItemContent(listItemNode: ListItemNode): string {
  return listItemNode.content
    .map(deriveBlockContent)
    .filter(hasVisibleText)
    .join("\n");
}

function deriveImageContent(imageNode: ImageNode): string {
  const caption = imageNode.attrs.caption?.trim();
  if (caption) return caption;

  return imageNode.attrs.alt.trim();
}

function deriveBlockContent(node: BlockNode): string {
  switch (node.type) {
    case "paragraph":
    case "heading":
      return deriveInlineContent(node.content ?? []);
    case "codeBlock":
      return deriveCodeBlockContent(node);
    case "image":
      return deriveImageContent(node);
    case "horizontalRule":
      return "";
    case "blockquote":
      return node.content
        .map(deriveBlockContent)
        .filter(hasVisibleText)
        .join("\n\n");
    case "bulletList":
    case "orderedList":
      return node.content
        .map(deriveListItemContent)
        .filter(hasVisibleText)
        .join("\n");
  }

  const exhaustiveNode: never = node;
  return exhaustiveNode;
}

export type TableOfContentsItem = {
  id: string;
  level: HeadingLevel;
  text: string;
};

export type ArticleDerivedData = {
  tableOfContents: TableOfContentsItem[];
  plainText: string;
  readingMinutes: number;
};

function deriveTableOfContents(
  document: ArticleDocument,
): TableOfContentsItem[] {
  return document.content
    .filter((node) => node.type === "heading")
    .map((node) => ({
      id: node.attrs.id,
      level: node.attrs.level,
      text: deriveInlineContent(node.content ?? [])
        .replace(/\s+/g, " ")
        .trim(),
    }))
    .filter((item) => item.text.length > 0);
}

function derivePlainText(document: ArticleDocument): string {
  return document.content
    .map(deriveBlockContent)
    .filter(hasVisibleText)
    .join("\n\n")
    .trim();
}

const CJK_CHARACTER_PATTERN =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu;
const NON_CJK_WORD_PATTERN = /[\p{L}\p{N}]+/gu;

function countWords(plainText: string) {
  const cjkCharacterCount = plainText.match(CJK_CHARACTER_PATTERN)?.length ?? 0;
  const nonCjkText = plainText.replace(CJK_CHARACTER_PATTERN, " ");
  const nonCjkWordCount = nonCjkText.match(NON_CJK_WORD_PATTERN)?.length ?? 0;

  return { cjkCharacterCount, nonCjkWordCount };
}

function calculateReadingMinutes(plainText: string): number {
  const { cjkCharacterCount, nonCjkWordCount } = countWords(plainText);
  const readingMinutes = cjkCharacterCount / 300 + nonCjkWordCount / 200;

  return Math.max(1, Math.ceil(readingMinutes));
}

/**
 * Editor statistics (FR-ADMIN-23). A CJK character counts as one word, the
 * same unit the reading time uses.
 */
export function deriveArticleStats(document: ArticleDocument): {
  words: number;
  readingMinutes: number;
} {
  const plainText = derivePlainText(document);
  const { cjkCharacterCount, nonCjkWordCount } = countWords(plainText);

  return {
    words: cjkCharacterCount + nonCjkWordCount,
    readingMinutes: calculateReadingMinutes(plainText),
  };
}

export function deriveArticleContent(
  document: ArticleDocument,
): ArticleDerivedData {
  const plainText = derivePlainText(document);

  return {
    tableOfContents: deriveTableOfContents(document),
    plainText,
    readingMinutes: calculateReadingMinutes(plainText),
  };
}
