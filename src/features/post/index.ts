export { CONTENT_SCHEMA_VERSION, CODE_LANGUAGES } from "./content/types";

export type {
  ArticleDocument,
  BlockNode,
  InlineNode,
  Mark,
  CodeLanguage,
  HeadingLevel,
  TextNode,
  HardBreakNode,
  ParagraphNode,
  HeadingNode,
  BlockquoteNode,
  BulletListNode,
  OrderedListNode,
  ListItemNode,
  ListBlockNode,
  HorizontalRuleNode,
  ImageNode,
  PlainTextNode,
  CodeBlockNode,
} from "./content/types";

export {
  validateArticleDocument,
  parseArticleDocument,
  collectMediaReferences,
  validateMediaReferences,
} from "./content/validate";

export type {
  ValidationIssue,
  ValidationResult,
  MediaReferenceResolver,
} from "./content/validate";

export {
  deriveArticleContent,
  type ArticleDerivedData,
  type TableOfContentsItem,
} from "./content/derive";

export {
  ArticleContent,
  type ArticleContentProps,
} from "./content/render/article-content";

export type { ArticleMedia, ArticleMediaMap } from "./content/render/media";
