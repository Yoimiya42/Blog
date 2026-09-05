import { Heading } from "@tiptap/extension-heading";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Mapping } from "@tiptap/pm/transform";

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
        appendTransaction: (transactions, oldState, newState) => {
          if (!transactions.some((transaction) => transaction.docChanged)) {
            return null;
          }

          const mapping = new Mapping();
          for (const transaction of transactions) {
            mapping.appendMapping(transaction.mapping);
          }

          // Headings that survived this change, at their new positions. They
          // own their id even when a pasted copy now sits above them;
          // resolving duplicates by document order would move the anchor to
          // the copy and break links to the original.
          const established = new Map<number, string>();
          oldState.doc.descendants((node, pos) => {
            if (node.type.name !== nodeName) return;
            const id: unknown = node.attrs.id;
            if (typeof id !== "string") return;
            const mapped = mapping.mapResult(pos);
            if (!mapped.deleted) established.set(mapped.pos, id);
          });

          const used = new Set<string>();
          const unresolved: number[] = [];

          newState.doc.descendants((node, pos) => {
            if (node.type.name !== nodeName) return;
            const id: unknown = node.attrs.id;
            if (
              typeof id === "string" &&
              HEADING_ID_PATTERN.test(id) &&
              established.get(pos) === id &&
              !used.has(id)
            ) {
              used.add(id);
              return;
            }
            unresolved.push(pos);
          });

          const transaction = newState.tr;
          let changed = false;

          for (const pos of unresolved) {
            const id: unknown = newState.doc.nodeAt(pos)?.attrs.id;
            // A new heading may still carry a usable id, from a first load or
            // a paste of content nothing else claims.
            if (
              typeof id === "string" &&
              HEADING_ID_PATTERN.test(id) &&
              !used.has(id)
            ) {
              used.add(id);
              continue;
            }

            let fresh = createHeadingId();
            while (used.has(fresh)) fresh = createHeadingId();
            used.add(fresh);
            transaction.setNodeAttribute(pos, "id", fresh);
            changed = true;
          }

          return changed ? transaction : null;
        },
      }),
    ];
  },
});
