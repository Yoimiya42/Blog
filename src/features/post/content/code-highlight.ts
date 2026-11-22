import type { LanguageRegistration, ThemeRegistration } from "shiki/core";

import type { CodeLanguage } from "./types";

/**
 * The single source of the article code theme and grammars. The server
 * renderer and the editor both load from here, so editor colours always match
 * the published article (ADR-0027).
 */
export const CODE_THEME = "github-dark";

export type HighlightedLanguage = Exclude<CodeLanguage, "plaintext">;

type Loader<T> = () => Promise<T>;

const grammar =
  (
    load: () => Promise<{ default: LanguageRegistration[] }>,
  ): Loader<LanguageRegistration[]> =>
  () =>
    load().then((module) => module.default);

/** One lazy import per grammar, so a bundler can split each into its own chunk. */
export const GRAMMAR_LOADERS: Readonly<
  Record<HighlightedLanguage, Loader<LanguageRegistration[]>>
> = {
  python: grammar(() => import("shiki/langs/python.mjs")),
  typescript: grammar(() => import("shiki/langs/typescript.mjs")),
  java: grammar(() => import("shiki/langs/java.mjs")),
  c: grammar(() => import("shiki/langs/c.mjs")),
  go: grammar(() => import("shiki/langs/go.mjs")),
};

export const loadCodeTheme: Loader<ThemeRegistration> = () =>
  import("shiki/themes/github-dark.mjs").then((module) => module.default);

/** Shiki's id for a language; plain text uses Shiki's built-in text mode. */
export function toShikiLanguage(
  language: CodeLanguage,
): HighlightedLanguage | "text" {
  return language === "plaintext" ? "text" : language;
}
