import { describe, expect, it } from "vitest";

import { deriveArticleContent } from "@/features/post/content/derive";
import type { ArticleDocument } from "@/features/post/content/types";

describe("article derived data", () => {
  it("builds a normalised table of contents and skips empty headings", () => {
    const document = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2, id: "intro" },
          content: [
            { type: "text", text: "  Introduction" },
            { type: "hardBreak" },
            { type: "text", text: "details  " },
          ],
        },
        {
          type: "heading",
          attrs: { level: 3, id: "empty" },
          content: [{ type: "text", text: "   " }],
        },
      ],
    } satisfies ArticleDocument;

    expect(deriveArticleContent(document).tableOfContents).toEqual([
      { id: "intro", level: 2, text: "Introduction details" },
    ]);
  });

  it("preserves text boundaries and derives image text", () => {
    const document = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "first" },
            { type: "hardBreak" },
            { type: "text", text: "second" },
          ],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "   " }],
        },
        {
          type: "image",
          attrs: { mediaId: "captioned", alt: "ignored", caption: " Caption " },
        },
        {
          type: "image",
          attrs: { mediaId: "described", alt: " Alt " },
        },
        {
          type: "image",
          attrs: { mediaId: "decorative", alt: "" },
        },
        {
          type: "codeBlock",
          attrs: { language: "typescript" },
          content: [
            { type: "text", text: "const " },
            { type: "text", text: "value = 1;" },
          ],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "item" }],
                },
                {
                  type: "bulletList",
                  content: [
                    {
                      type: "listItem",
                      content: [
                        {
                          type: "paragraph",
                          content: [{ type: "text", text: "nested" }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    } satisfies ArticleDocument;

    expect(deriveArticleContent(document).plainText).toBe(
      "first\nsecond\n\nCaption\n\nAlt\n\nconst value = 1;\n\nitem\nnested",
    );
  });

  it("calculates mixed CJK and non-CJK reading time", () => {
    const oneMinute = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "中".repeat(150) },
            { type: "text", text: ` ${Array(100).fill("word").join(" ")}` },
          ],
        },
      ],
    } satisfies ArticleDocument;
    const twoMinutes = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "中".repeat(151) },
            { type: "text", text: ` ${Array(100).fill("word").join(" ")}` },
          ],
        },
      ],
    } satisfies ArticleDocument;

    expect(deriveArticleContent(oneMinute).readingMinutes).toBe(1);
    expect(deriveArticleContent(twoMinutes).readingMinutes).toBe(2);
  });

  it("returns one minute for an empty draft", () => {
    const document = {
      type: "doc",
      content: [{ type: "paragraph" }],
    } satisfies ArticleDocument;

    expect(deriveArticleContent(document)).toEqual({
      tableOfContents: [],
      plainText: "",
      readingMinutes: 1,
    });
  });
});
