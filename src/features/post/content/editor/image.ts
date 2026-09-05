import { Node } from "@tiptap/core";

/**
 * Project-owned image node. Only a media reference is stored, so changing the
 * image host or regenerating derivatives never rewrites article JSON. The
 * default URL-based Image extension is deliberately not registered.
 */
export const ArticleImage = Node.create({
  name: "image",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      mediaId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-media-id"),
        renderHTML: (attributes) => ({ "data-media-id": attributes.mediaId }),
      },
      alt: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-alt") ?? "",
        renderHTML: (attributes) => ({ "data-alt": attributes.alt }),
      },
      caption: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-caption"),
        // Returning null omits the attribute instead of writing "null".
        renderHTML: (attributes) =>
          typeof attributes.caption === "string"
            ? { "data-caption": attributes.caption }
            : null,
      },
    };
  },

  parseHTML() {
    return [{ tag: "figure[data-media-id]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["figure", HTMLAttributes];
  },
});
