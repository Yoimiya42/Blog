import { Blockquote } from "@tiptap/extension-blockquote";

/**
 * The bundled extension accepts any block. Schema v1 excludes headings,
 * images, and nested quotes, so the editor must refuse them too: otherwise a
 * paste builds content the server rejects on save.
 */
export const ArticleBlockquote = Blockquote.extend({
  content:
    "(paragraph | bulletList | orderedList | codeBlock | horizontalRule)+",
});
