import { CODE_LANGUAGES, type CodeLanguage } from "../types";

export const CODE_LANGUAGE_LABELS: Record<CodeLanguage, string> = {
  plaintext: "Plain text",
  python: "Python",
  typescript: "TypeScript",
  java: "Java",
  c: "C",
  go: "Go",
};

export const CODE_LANGUAGE_OPTIONS = CODE_LANGUAGES.map((value) => ({
  value,
  label: CODE_LANGUAGE_LABELS[value],
}));

export function codeLanguageLabel(language: unknown): string {
  return typeof language === "string" &&
    Object.hasOwn(CODE_LANGUAGE_LABELS, language)
    ? CODE_LANGUAGE_LABELS[language as CodeLanguage]
    : CODE_LANGUAGE_LABELS.plaintext;
}
