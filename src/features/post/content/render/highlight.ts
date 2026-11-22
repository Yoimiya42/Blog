import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import c from "shiki/langs/c.mjs";
import go from "shiki/langs/go.mjs";
import java from "shiki/langs/java.mjs";
import python from "shiki/langs/python.mjs";
import typescript from "shiki/langs/typescript.mjs";
import githubDark from "shiki/themes/github-dark.mjs";

import type { CodeLanguage } from "../types";

// Dark, to match the code card shared with the editor.
const ARTICLE_CODE_THEME = "github-dark";

const highlighterPromise = createHighlighterCore({
  themes: [githubDark],
  langs: [python, typescript, java, c, go],
  engine: createJavaScriptRegexEngine(),
});

function toShikiLanguage(
  language: CodeLanguage,
): Exclude<CodeLanguage, "plaintext"> | "text" {
  return language === "plaintext" ? "text" : language;
}

export async function highlightCode(code: string, language: CodeLanguage) {
  const highlighter = await highlighterPromise;

  return highlighter.codeToTokens(code, {
    lang: toShikiLanguage(language),
    theme: ARTICLE_CODE_THEME,
  });
}
