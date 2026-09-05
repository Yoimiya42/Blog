export const CONTENT_SCHEMA_VERSION = 1;

/** Shiki bundles exactly these grammars, so the list is shared with the renderer. */
export const CODE_LANGUAGES = [
  "plaintext",
  "python",
  "typescript",
  "java",
  "c",
  "go",
] as const;

export type CodeLanguage = (typeof CODE_LANGUAGES)[number];

export type HeadingLevel = 2 | 3 | 4;

export type BoldMark = { type: "bold" };
export type ItalicMark = { type: "italic" };
export type StrikeMark = { type: "strike" };
export type CodeMark = { type: "code" };
export type LinkMark = { type: "link"; attrs: { href: string } };

export type Mark = BoldMark | ItalicMark | StrikeMark | CodeMark | LinkMark;

export type TextNode = {
  type: "text";
  text: string;
  marks?: Mark[];
};

export type HardBreakNode = { type: "hardBreak" };

export type InlineNode = TextNode | HardBreakNode;

export type ParagraphNode = {
  type: "paragraph";
  content?: InlineNode[];
};

export type HeadingNode = {
  type: "heading";
  attrs: { level: HeadingLevel; id: string };
  content?: InlineNode[];
};

/** No headings and no nested quotes: both break the table of contents. */
export type BlockquoteContentNode =
  | ParagraphNode
  | BulletListNode
  | OrderedListNode
  | CodeBlockNode
  | HorizontalRuleNode;

export type BlockquoteNode = {
  type: "blockquote";
  content: [BlockquoteContentNode, ...BlockquoteContentNode[]];
};

/** A list item opens with a paragraph so it always has a readable label. */
export type ListItemContentNode =
  ParagraphNode | BulletListNode | OrderedListNode | CodeBlockNode;

export type ListItemNode = {
  type: "listItem";
  content: [ParagraphNode, ...ListItemContentNode[]];
};

export type BulletListNode = {
  type: "bulletList";
  content: [ListItemNode, ...ListItemNode[]];
};

export type OrderedListNode = {
  type: "orderedList";
  attrs?: { start: number };
  content: [ListItemNode, ...ListItemNode[]];
};

export type ListBlockNode = BulletListNode | OrderedListNode;

export type HorizontalRuleNode = { type: "horizontalRule" };

/** Dimensions and URLs are resolved through Media, never duplicated here. */
export type ImageNode = {
  type: "image";
  attrs: { mediaId: string; alt: string; caption?: string };
};

/** Code block text carries no marks, so it cannot reuse TextNode. */
export type PlainTextNode = {
  type: "text";
  text: string;
};

export type CodeBlockNode = {
  type: "codeBlock";
  attrs: { language: CodeLanguage };
  content?: PlainTextNode[];
};

export type BlockNode =
  | ParagraphNode
  | HeadingNode
  | BlockquoteNode
  | BulletListNode
  | OrderedListNode
  | HorizontalRuleNode
  | ImageNode
  | CodeBlockNode;

export type ArticleDocument = {
  type: "doc";
  content: [BlockNode, ...BlockNode[]];
};
