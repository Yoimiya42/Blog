import { describe, expect, it, vi } from "vitest";

vi.mock("shiki/core", { spy: true });
import { createHighlighterCore } from "shiki/core";
import { CODE_LANGUAGES } from "@/features/post/content/types";

describe("highlighter initialization", () => {
  it("shares one module-level promise across concurrent and later highlights", async () => {
    const { highlightCode } =
      await import("@/features/post/content/render/highlight");
    const results = await Promise.all(
      CODE_LANGUAGES.map((language) => highlightCode("value\nnext", language)),
    );
    for (const result of results) {
      expect(
        result.tokens
          .map((line) => line.map((token) => token.content).join(""))
          .join("\n"),
      ).toBe("value\nnext");
      expect(result.themeName).toBe("github-light");
    }
    await highlightCode("again", "python");
    expect(createHighlighterCore).toHaveBeenCalledTimes(1);
    const options = vi.mocked(createHighlighterCore).mock.calls[0][0];
    expect(options.langs).toHaveLength(5);
    expect(options.themes).toHaveLength(1);
    const highlighter = await vi.mocked(createHighlighterCore).mock.results[0]
      .value;
    expect(highlighter.getLoadedLanguages().sort()).toEqual(
      [
        "c",
        "go",
        "java",
        "python",
        "py",
        "typescript",
        "ts",
        "cts",
        "mts",
      ].sort(),
    );
    expect(highlighter.getLoadedThemes()).toEqual(["github-light"]);
  });
});
