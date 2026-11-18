import { StarterKit } from "@tiptap/starter-kit";

import { isSafeHref } from "../schema";
import { ArticleBlockquote } from "./blockquote";
import { ArticleHeading } from "./heading";
import { ArticleImage } from "./image";
import { ArticleListItem } from "./list-item";

/**
 * The editor may only produce what schema v1 accepts. Every disabled entry
 * below corresponds to a node or mark the shared schema rejects.
 */
const baseExtensions = [
  StarterKit.configure({
    // Replaced by ArticleHeading, which owns the id attribute and level default.
    heading: false,
    // Replaced to narrow their content expressions to schema v1.
    blockquote: false,
    listItem: false,
    // Schema v1 has no underline mark; on the web underline reads as a link.
    underline: false,
    // The bundled default is null, which schema v1 rejects.
    codeBlock: { defaultLanguage: "plaintext" },
    link: {
      openOnClick: false,
      defaultProtocol: "https",
      protocols: ["mailto"],
      // Same predicate the server validates with, so the editor cannot
      // produce a link the save would reject.
      isAllowedUri: (url) => isSafeHref(url),
    },
  }),
  ArticleHeading.configure({ levels: [2, 3, 4] }),
  ArticleBlockquote,
  ArticleListItem,
];

/**
 * `mediaUrls` lets the editor show the images it can resolve. It is read on
 * each render, so entries added later apply to nodes inserted afterwards.
 * Pass one record per editor instance.
 */
export function createArticleEditorExtensions(
  mediaUrls: Readonly<Record<string, string>> = {},
) {
  return [
    ...baseExtensions,
    ArticleImage.configure({
      mediaUrl: (mediaId) =>
        Object.hasOwn(mediaUrls, mediaId) ? mediaUrls[mediaId] : undefined,
    }),
  ];
}

/** Extensions without image previews, for tests and static conversions. */
export const articleEditorExtensions = createArticleEditorExtensions();
