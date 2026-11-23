import { Extension, InputRule } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

import { isSafeHref } from "../schema";

/**
 * Transaction meta that asks the toolbar to open the link pair
 * (FR-ADMIN-24). Without a range the toolbar reads the selection.
 */
export const LINK_PROMPT = "articleLinkPrompt";

export interface LinkPromptMeta {
  /** A link just inserted by a paste; its text field opens empty. */
  pasted?: { from: number; to: number };
}

const SCHEME = /^[a-z][a-z\d+.-]*:/i;
// A host with a dot and a letter-only top-level label, then the end or a
// path, query, fragment, or port.
const BARE_DOMAIN = /^[^\s/?#:@]+\.[a-z]{2,}(?:[/?#:]|$)/i;
const DOMAIN_WITH_PORT = /^[^\s/?#:@]+\.[a-z]{2,}:\d/i;

/**
 * What the owner typed into the address field, made storable: trimmed, and
 * `https://` added to a bare domain such as `www.google.com`. Anything else is
 * returned unchanged for `isSafeHref` to judge.
 */
export function normalizeLinkHref(raw: string): string {
  const href = raw.trim();
  if (href === "" || href.startsWith("/") || href.startsWith("#")) {
    return href;
  }
  // `example.dev:8080` would otherwise read as the scheme `example.dev:`.
  if (DOMAIN_WITH_PORT.test(href)) return `https://${href}`;
  if (SCHEME.test(href)) return href;

  return BARE_DOMAIN.test(href) ? `https://${href}` : href;
}

/**
 * The address a pasted clipboard text stands for, or null when the text is
 * not one web address. Only http and https count: a pasted path or mailto
 * address is more likely prose.
 */
export function pastedWebAddress(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed === "" || /\s/.test(trimmed)) return null;
  const href = normalizeLinkHref(trimmed);

  return /^https?:\/\//i.test(href) && isSafeHref(href) ? href : null;
}

/** `[text](address)` typed in prose; the closing parenthesis triggers it. */
export const MARKDOWN_LINK = /\[([^[\]]+)\]\(([^()\s]+)\)$/;

/**
 * Link entry beyond the toolbar button (FR-ADMIN-24): Ctrl or Cmd+K, a pasted
 * web address that opens the pair with its text empty, and the Markdown
 * shorthand. Every path checks the address with the server's predicate.
 */
export const ArticleLinkTools = Extension.create({
  name: "articleLinkTools",

  addKeyboardShortcuts() {
    return {
      "Mod-k": ({ editor }) => {
        if (!editor.can().setLink({ href: "/" }) && !editor.isActive("link")) {
          return false;
        }
        const meta: LinkPromptMeta = {};
        editor.view.dispatch(editor.state.tr.setMeta(LINK_PROMPT, meta));
        return true;
      },
    };
  },

  addInputRules() {
    return [
      new InputRule({
        find: MARKDOWN_LINK,
        handler: ({ state, range, match }) => {
          const link = state.schema.marks.link;
          const href = normalizeLinkHref(match[2] ?? "");
          const text = match[1] ?? "";
          if (!link || !isSafeHref(href)) return null;
          // One input event that carries the whole syntax (an input method
          // commit, autocorrect) yields an inverted range; returning null
          // lets the text insert unconverted instead of being dropped.
          if (range.from > range.to) return null;

          state.tr
            .replaceWith(
              range.from,
              range.to,
              state.schema.text(text, [link.create({ href })]),
            )
            // Typing on after the link must not extend it.
            .removeStoredMark(link);
        },
      }),
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("articleLinkPaste"),
        props: {
          handlePaste: (view, event, slice) => {
            const { state } = view;
            const { selection } = state;
            const link = state.schema.marks.link;
            // A selection becomes the link text through the Link extension.
            if (!link || !selection.empty) return false;
            if (selection.$from.parent.type.spec.code) return false;
            if (!selection.$from.parent.type.allowsMarkType(link)) return false;

            // The slice covers pastes without clipboard data, such as
            // ProseMirror's own `pasteText`.
            const text =
              event.clipboardData?.getData("text/plain") ||
              slice.content.textBetween(0, slice.content.size, " ");
            const href = pastedWebAddress(text);
            if (!href) return false;

            const label = text.trim();
            const from = selection.from;
            const to = from + label.length;
            const meta: LinkPromptMeta = { pasted: { from, to } };
            view.dispatch(
              state.tr
                .replaceSelectionWith(
                  state.schema.text(label, [link.create({ href })]),
                  false,
                )
                .removeStoredMark(link)
                .setMeta(LINK_PROMPT, meta),
            );
            return true;
          },
        },
      }),
    ];
  },
});
