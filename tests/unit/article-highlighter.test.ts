import { readFileSync } from "node:fs";
import { join } from "node:path";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, expectTypeOf, it } from "vitest";

import {
  CODE_LANGUAGES,
  type CodeBlockNode,
  type CodeLanguage,
} from "@/features/post";
import { CodeBlock } from "@/features/post/content/render/code-block";
import { highlightCode } from "@/features/post/content/render/highlight";

const CODE_SAMPLES = {
  plaintext: "plain output",
  python: "print('hello')",
  typescript: "const value: number = 1;",
  java: "int value = 1;",
  c: "int value = 1;",
  cpp: "std::vector<int> value;",
  go: "value := 1",
} satisfies Record<CodeLanguage, string>;

function tokenText(
  tokens: Awaited<ReturnType<typeof highlightCode>>["tokens"],
): string {
  return tokens
    .map((line) => line.map((token) => token.content).join(""))
    .join("\n");
}

describe("article code highlighting", () => {
  it("highlights every allowed language without changing code", async () => {
    expect(CODE_LANGUAGES).toHaveLength(7);

    for (const language of CODE_LANGUAGES) {
      const highlighted = await highlightCode(CODE_SAMPLES[language], language);

      expect(tokenText(highlighted.tokens)).toBe(CODE_SAMPLES[language]);
      expect(highlighted.themeName).toBe("github-dark");
      expect(highlighted.fg).toMatch(/^#[0-9a-f]{6}$/i);
      expect(highlighted.bg).toMatch(/^#[0-9a-f]{3,6}$/i);
    }
  });

  it("colours C++ with the C grammar", async () => {
    const code = '#include <stdio.h>\nint main() { return 0; } // "done"';
    const [cpp, c] = await Promise.all([
      highlightCode(code, "cpp"),
      highlightCode(code, "c"),
    ]);

    expect(cpp.tokens).toEqual(c.tokens);
    // Directive, keyword, string, comment, and plain text are told apart.
    const colours = new Set(cpp.tokens.flat().map((token) => token.color));
    expect(colours.size).toBeGreaterThanOrEqual(4);
  });

  it("accepts only the project code-language type", () => {
    expectTypeOf(highlightCode).parameter(1).toEqualTypeOf<CodeLanguage>();
  });

  it("escapes HTML-like code through React rendering", async () => {
    const node = {
      type: "codeBlock",
      attrs: { language: "typescript" },
      content: [{ type: "text", text: '<script>alert("x")</script>' }],
    } satisfies CodeBlockNode;

    const markup = renderToStaticMarkup(await CodeBlock({ node }));

    expect(markup).not.toContain("<script>");
    expect(markup).toContain("&lt;");
    expect(markup).toContain("script");
    expect(markup).toContain("&gt;");
  });

  it("renders an empty code block with controls", async () => {
    const node = {
      type: "codeBlock",
      attrs: { language: "go" },
    } satisfies CodeBlockNode;

    const markup = renderToStaticMarkup(await CodeBlock({ node }));

    expect(markup).toContain('<figure data-code-block="">');
    expect(markup).toContain("<span>Go</span>");
    expect(markup).toContain("Copy code");
    expect(markup).toContain("<code>");
  });

  it("keeps the client copy control free of editor and highlighter imports", () => {
    const source = readFileSync(
      join(
        process.cwd(),
        "src",
        "features",
        "post",
        "content",
        "render",
        "copy-code-button.tsx",
      ),
      "utf8",
    );

    expect(source.trimStart().startsWith('"use client";')).toBe(true);
    expect(source).not.toMatch(/from\s+["']shiki/);
    expect(source).not.toMatch(/@tiptap/);
    expect(source).not.toMatch(/\.\.\/types/);
  });
});
