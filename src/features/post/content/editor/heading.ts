import { Heading } from "@tiptap/extension-heading";
import { Plugin, PluginKey } from "@tiptap/pm/state";

const HEADING_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const HEADING_ID_BYTES = 6;

const headingIdPluginKey = new PluginKey("articleHeadingId");

/**
 * Random rather than derived from the heading text: ids must survive a title
 * edit so existing anchor links keep working, and CJK titles have no usable
 * slug form.
 */
function createHeadingId(): string {
  const bytes = new Uint8Array(HEADING_ID_BYTES);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

export const ArticleHeading = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      // The bundled extension hardcodes 1, which schema v1 rejects.
      level: { default: 2, rendered: false },
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("id"),
        renderHTML: (attributes) =>
          typeof attributes.id === "string" ? { id: attributes.id } : null,
      },
    };
  },

  addProseMirrorPlugins() {
    const nodeName = this.name;

    return [
      new Plugin({
        key: headingIdPluginKey,
        appendTransaction: (transactions, _oldState, newState) => {
          if (!transactions.some((transaction) => transaction.docChanged)) {
            return null;
          }

          const transaction = newState.tr;
          const used = new Set<string>();
          let changed = false;

          newState.doc.descendants((node, pos) => {
            if (node.type.name !== nodeName) return;

            const id: unknown = node.attrs.id;
            // Keep an existing id so editing the text never breaks its anchor.
            if (
              typeof id === "string" &&
              HEADING_ID_PATTERN.test(id) &&
              !used.has(id)
            ) {
              used.add(id);
              return;
            }

            // Missing, malformed, or duplicated after a copy and paste.
            let fresh = createHeadingId();
            while (used.has(fresh)) fresh = createHeadingId();
            used.add(fresh);
            transaction.setNodeAttribute(pos, "id", fresh);
            changed = true;
          });

          return changed ? transaction : null;
        },
      }),
    ];
  },
});
