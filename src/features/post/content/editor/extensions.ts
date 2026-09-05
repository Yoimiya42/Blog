import { StarterKit } from "@tiptap/starter-kit";

import { isSafeHref } from "../schema";
import { ArticleHeading } from "./heading";
import { ArticleImage } from "./image";

/**
 * The editor may only produce what schema v1 accepts. Every disabled entry
 * below corresponds to a node or mark the shared schema rejects.
 */
export const articleEditorExtensions = [
  StarterKit.configure({
    // Replaced by ArticleHeading, which owns the id attribute and level default.
    heading: false,
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
  ArticleImage,
];
