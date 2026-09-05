import { ListItem } from "@tiptap/extension-list";

/**
 * The bundled expression is "paragraph block*", which admits headings, images,
 * and quotes. Schema v1 keeps a list item to prose, nested lists, and code, and
 * requires the opening paragraph so every item has a readable label.
 */
export const ArticleListItem = ListItem.extend({
  content: "paragraph (paragraph | bulletList | orderedList | codeBlock)*",
});
