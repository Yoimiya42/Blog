import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

import {
  CODE_THEME,
  GRAMMAR_LOADERS,
  loadCodeTheme,
  toShikiLanguage,
} from "../code-highlight";
import type { CodeLanguage } from "../types";

// The server loads every grammar once; the editor loads them per language.
const highlighterPromise = createHighlighterCore({
  themes: [loadCodeTheme()],
  langs: Object.values(GRAMMAR_LOADERS).map((load) => load()),
  engine: createJavaScriptRegexEngine(),
});

export async function highlightCode(code: string, language: CodeLanguage) {
  const highlighter = await highlighterPromise;

  return highlighter.codeToTokens(code, {
    lang: toShikiLanguage(language),
    theme: CODE_THEME,
  });
}
