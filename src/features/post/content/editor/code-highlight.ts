import { Extension } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";
import type { HighlighterCore, ThemedToken } from "shiki/core";

import {
  CODE_THEME,
  GRAMMAR_LOADERS,
  loadCodeTheme,
  toShikiLanguage,
  type HighlightedLanguage,
} from "../code-highlight";
import type { CodeLanguage } from "../types";

const highlightKey = new PluginKey<DecorationSet>("articleCodeHighlight");
const REFRESH = "refresh";

// One highlighter per page, created on first use. Shiki core and the engine
// are imported lazily so the editor chunk does not carry them up front.
let highlighterPromise: Promise<HighlighterCore> | null = null;
let highlighter: HighlighterCore | null = null;
const loadedLanguages = new Set<HighlightedLanguage>();
const pendingLanguages = new Map<HighlightedLanguage, Promise<void>>();

function getHighlighter(): Promise<HighlighterCore> {
  highlighterPromise ??= Promise.all([
    import("shiki/core"),
    import("shiki/engine/javascript"),
  ]).then(async ([core, engine]) => {
    highlighter = await core.createHighlighterCore({
      themes: [loadCodeTheme()],
      langs: [],
      engine: engine.createJavaScriptRegexEngine(),
    });
    return highlighter;
  });

  return highlighterPromise;
}

function loadLanguage(language: HighlightedLanguage): Promise<void> {
  let pending = pendingLanguages.get(language);
  if (!pending) {
    pending = getHighlighter()
      .then(async (instance) => {
        await instance.loadLanguage(GRAMMAR_LOADERS[language]());
        loadedLanguages.add(language);
      })
      // A failed fetch leaves the block plain and allows a later retry.
      .catch(() => {
        pendingLanguages.delete(language);
      });
    pendingLanguages.set(language, pending);
  }

  return pending;
}

// Unchanged blocks keep the same node object across transactions, so tokens
// are computed once per edit of a block, not once per keystroke anywhere.
const tokenCache = new WeakMap<
  ProseMirrorNode,
  { language: string; tokens: ThemedToken[][] }
>();

function tokensFor(
  node: ProseMirrorNode,
  language: HighlightedLanguage,
): ThemedToken[][] {
  const cached = tokenCache.get(node);
  if (cached?.language === language) return cached.tokens;

  const tokens = highlighter!.codeToTokens(node.textContent, {
    lang: language,
    theme: CODE_THEME,
  }).tokens;
  tokenCache.set(node, { language, tokens });

  return tokens;
}

function buildDecorations(
  doc: ProseMirrorNode,
  request: (language: HighlightedLanguage) => void,
): DecorationSet {
  const decorations: Decoration[] = [];

  doc.descendants((node, position) => {
    if (node.type.name !== "codeBlock") return true;

    const language = toShikiLanguage(node.attrs.language as CodeLanguage);
    if (language === "text" || !Object.hasOwn(GRAMMAR_LOADERS, language)) {
      return false;
    }
    if (!highlighter || !loadedLanguages.has(language)) {
      request(language);
      return false;
    }

    // The block's text starts one position after the node's opening token.
    const start = position + 1;
    for (const line of tokensFor(node, language)) {
      for (const token of line) {
        if (!token.color || token.content.length === 0) continue;
        const from = start + token.offset;
        decorations.push(
          Decoration.inline(from, from + token.content.length, {
            style: `color: ${token.color}`,
          }),
        );
      }
    }

    return false;
  });

  return DecorationSet.create(doc, decorations);
}

/**
 * Colours code blocks with the same Shiki theme and grammars as the published
 * article (ADR-0027). Decorations only: the stored document never changes.
 */
export const ArticleCodeHighlight = Extension.create({
  name: "articleCodeHighlight",

  addProseMirrorPlugins() {
    let view: EditorView | null = null;

    // Repaint once a grammar arrives; the editor may be gone by then.
    const request = (language: HighlightedLanguage) => {
      void loadLanguage(language).then(() => {
        if (view && !view.isDestroyed && loadedLanguages.has(language)) {
          view.dispatch(view.state.tr.setMeta(highlightKey, REFRESH));
        }
      });
    };

    return [
      new Plugin<DecorationSet>({
        key: highlightKey,
        state: {
          init: (_config, state) => buildDecorations(state.doc, request),
          apply: (transaction, previous) =>
            transaction.docChanged ||
            transaction.getMeta(highlightKey) === REFRESH
              ? buildDecorations(transaction.doc, request)
              : previous,
        },
        props: {
          decorations: (state) => highlightKey.getState(state),
        },
        view: (editorView) => {
          view = editorView;
          return {
            destroy: () => {
              view = null;
            },
          };
        },
      }),
    ];
  },
});
