import { describe, expect, it } from "vitest";

import {
  deriveArticleContent,
  parseArticleDocument,
  type ArticleDocument,
} from "@/features/post";

describe("article derived data", () => {
  it.each([
    ["Han", "中".repeat(301), 2],
    ["Hiragana", "あ".repeat(301), 2],
    ["Katakana", "ア".repeat(301), 2],
    ["Hangul", "한".repeat(301), 2],
    ["English", "word ".repeat(201), 2],
    ["punctuation", " !?，。 \n".repeat(400), 1],
  ])("counts %s independently", (_name, text, expected) => {
    const document = parseArticleDocument({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text }] }],
    });
    expect(deriveArticleContent(document).readingMinutes).toBe(expected);
  });

  it("derives the complete mixed article from one unchanged document", () => {
    const prose = "中".repeat(150) + " word".repeat(100);
    const document = parseArticleDocument({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { id: "intro", level: 2 },
          content: [
            { type: "text", text: "Intro", marks: [{ type: "bold" }] },
            { type: "text", text: "  details", marks: [{ type: "italic" }] },
          ],
        },
        {
          type: "heading",
          attrs: { id: "empty", level: 3 },
          content: [{ type: "text", text: "  " }],
        },
        {
          type: "heading",
          attrs: { id: "method", level: 3 },
          content: [{ type: "text", text: "Method" }],
        },
        {
          type: "paragraph",
          content: [
            { type: "text", text: prose },
            { type: "hardBreak" },
            { type: "text", text: "next" },
          ],
        },
        {
          type: "blockquote",
          content: [
            { type: "paragraph", content: [{ type: "text", text: "quote" }] },
            {
              type: "orderedList",
              content: [
                {
                  type: "listItem",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "item" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: "heading",
          attrs: { id: "result", level: 4 },
          content: [{ type: "text", text: "Result" }],
        },
        {
          type: "codeBlock",
          attrs: { language: "plaintext" },
          content: [{ type: "text", text: "output\nready" }],
        },
        {
          type: "image",
          attrs: { mediaId: "one", alt: "ignored", caption: " Caption " },
        },
        {
          type: "image",
          attrs: { mediaId: "two", alt: " Alt ", caption: "  " },
        },
        { type: "image", attrs: { mediaId: "three", alt: "" } },
      ],
    });
    const saved = JSON.stringify(document);
    const expected = {
      tableOfContents: [
        { id: "intro", level: 2, text: "Intro details" },
        { id: "method", level: 3, text: "Method" },
        { id: "result", level: 4, text: "Result" },
      ],
      plainText: `Intro  details\n\nMethod\n\n${prose}\nnext\n\nquote\n\nitem\n\nResult\n\noutput\nready\n\nCaption\n\nAlt`,
      readingMinutes: 2,
    };
    expect(deriveArticleContent(document)).toEqual(expected);
    expect(deriveArticleContent(document)).toEqual(expected);
    expect(JSON.stringify(document)).toBe(saved);
  });

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
