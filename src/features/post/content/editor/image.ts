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
      /** Sets the alt text of every image node that shows `mediaId`. */
      setArticleImageAlt: (mediaId: string, alt: string) => ReturnType;
    };
  }
}

export interface ArticleImageOptions {
  /**
   * Display URL for a media id, or undefined to show a placeholder. A
   * function, not a record: `configure` deep-copies plain objects, so later
   * uploads would not reach a record. Display only; the stored node keeps
   * the media id alone.
   */
  mediaUrl: (mediaId: string) => string | undefined;
  /** True for an id deleted from the media library (ADR-0025). */
  isDeleted: (mediaId: string) => boolean;
}

const IMAGE_PLACEHOLDER_CLASS =
  "rounded-control border border-dashed border-faint bg-muted/50 p-4 text-sm text-muted-foreground";
const IMAGE_DELETED_CLASS =
  "rounded-control border border-dashed border-destructive bg-destructive/10 p-4 text-sm text-destructive";
const IMAGE_PREVIEW_CLASS = "rounded-control";

/**
 * Project-owned image node. Only a media reference is stored, so changing the
 * image host or regenerating derivatives never rewrites article JSON. The
 * default URL-based Image extension is deliberately not registered.
 */
export const ArticleImage = Node.create<ArticleImageOptions>({
  name: "image",
  group: "block",
  atom: true,
  draggable: true,

  addOptions() {
    return { mediaUrl: () => undefined, isDeleted: () => false };
  },

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
  // them is parsed back or persisted. An image with a known URL is shown; any
  // other falls back to a labelled placeholder.
  renderHTML({ node, HTMLAttributes }) {
    const alt: unknown = node.attrs.alt;
    const caption: unknown = node.attrs.caption;
    const altText = typeof alt === "string" ? alt : "";
    const mediaId = String(node.attrs.mediaId);
    const url = this.options.mediaUrl(mediaId);
    const deleted = !url && this.options.isDeleted(mediaId);
    const name = altText.trim() !== "" ? altText : mediaId;
    const label = deleted
      ? `Deleted image: ${name}. Remove it before publishing.`
      : altText.trim() !== ""
        ? `Image: ${altText}`
        : `Image ${mediaId}`;
    const captionNode =
      typeof caption === "string" && caption.trim() !== ""
        ? [["figcaption", {}, caption] as const]
        : [];

    if (url) {
      return [
        "figure",
        HTMLAttributes,
        [
          "img",
          {
            src: url,
            alt: altText,
            class: IMAGE_PREVIEW_CLASS,
            "data-image-preview": "",
          },
        ],
        ...captionNode,
      ];
    }

    return [
      "figure",
      {
        ...HTMLAttributes,
        class: deleted ? IMAGE_DELETED_CLASS : IMAGE_PLACEHOLDER_CLASS,
      },
      ["div", { "data-image-placeholder": deleted ? "deleted" : "" }, label],
      ...captionNode,
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

      setArticleImageAlt:
        (mediaId, alt) =>
        ({ tr, state, dispatch }) => {
          let found = false;
          state.doc.descendants((node, position) => {
            if (node.type.name !== this.name) return;
            if (node.attrs.mediaId !== mediaId) return;
            found = true;
            // The command manager dispatches `tr`; a dry run leaves it alone.
            if (dispatch) {
              tr.setNodeMarkup(position, undefined, { ...node.attrs, alt });
            }
          });

          return found;
        },
    };
  },
});
