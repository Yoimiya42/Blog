import { Node } from "@tiptap/core";

export interface ArticleImageAttributes {
  /** Id of a stored Media record. */
  mediaId: string;
  /** Empty for a decorative image. */
  alt: string;
  caption?: string | null;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    articleImage: {
      /** Inserts an image node that references stored media. */
      insertArticleImage: (attributes: ArticleImageAttributes) => ReturnType;
    };
  }
}

const IMAGE_PLACEHOLDER_CLASS =
  "rounded-lg border border-dashed border-stone-400 bg-stone-50 p-4 text-sm text-stone-600";

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

  // The node is an atom, so the children below are display only: nothing in
  // them is parsed back or persisted. Until Issue #14 adds the Media table
  // there is no URL to load, so the editor shows a labelled placeholder.
  renderHTML({ node, HTMLAttributes }) {
    const alt: unknown = node.attrs.alt;
    const caption: unknown = node.attrs.caption;
    const label =
      typeof alt === "string" && alt.trim() !== ""
        ? `Image: ${alt}`
        : `Image ${String(node.attrs.mediaId)}`;

    return [
      "figure",
      { ...HTMLAttributes, class: IMAGE_PLACEHOLDER_CLASS },
      ["div", { "data-image-placeholder": "" }, label],
      ...(typeof caption === "string" && caption.trim() !== ""
        ? [["figcaption", {}, caption] as const]
        : []),
    ];
  },

  addCommands() {
    return {
      insertArticleImage:
        (attributes) =>
        ({ commands }) => {
          // The media library calls this with a stored Media id. An empty id
          // would produce a node the server rejects, so it is refused here.
          if (attributes.mediaId.trim() === "") return false;

          return commands.insertContent({
            type: this.name,
            attrs: {
              mediaId: attributes.mediaId,
              alt: attributes.alt,
              caption: attributes.caption ?? null,
            },
          });
        },
    };
  },
});
