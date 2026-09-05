import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  ArticleContent,
  collectMediaReferences,
  deriveArticleContent,
  validateArticleDocument,
  type ArticleDocument,
  type ArticleMediaMap,
} from "@/features/post";

const completeArticle = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 2, id: "architecture" },
      content: [{ type: "text", text: "Architecture" }],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Bold", marks: [{ type: "bold" }] },
        { type: "text", text: " italic", marks: [{ type: "italic" }] },
        { type: "text", text: " old", marks: [{ type: "strike" }] },
        { type: "text", text: " const", marks: [{ type: "code" }] },
        { type: "hardBreak" },
        {
          type: "text",
          text: "internal",
          marks: [{ type: "link", attrs: { href: "/blog/next" } }],
        },
        { type: "text", text: " and " },
        {
          type: "text",
          text: "external",
          marks: [{ type: "link", attrs: { href: "https://example.com" } }],
        },
      ],
    },
    {
      type: "blockquote",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Quoted guidance." }],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Quoted item" }],
                },
              ],
            },
          ],
        },
        { type: "horizontalRule" },
      ],
    },
    {
      type: "orderedList",
      attrs: { start: 3 },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Third item" }],
            },
            {
              type: "bulletList",
              content: [
                {
                  type: "listItem",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Nested item" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: "image",
      attrs: {
        mediaId: "med_architecture",
        alt: "System architecture diagram",
        caption: "System architecture",
      },
    },
    {
      type: "codeBlock",
      attrs: { language: "typescript" },
      content: [
        { type: "text", text: 'const value: string = "<main>safe</main>";' },
      ],
    },
  ],
} satisfies ArticleDocument;

const mediaById = {
  med_architecture: {
    url: "/media/architecture.webp",
    width: 1600,
    height: 900,
    blurhash: null,
  },
} satisfies ArticleMediaMap;

describe("article content integration", () => {
  it("derives metadata and media references through the public API", () => {
    expect(validateArticleDocument(completeArticle)).toEqual({
      ok: true,
      document: completeArticle,
    });
    expect(collectMediaReferences(completeArticle)).toEqual([
      "med_architecture",
    ]);

    const derived = deriveArticleContent(completeArticle);

    expect(derived.tableOfContents).toEqual([
      { id: "architecture", level: 2, text: "Architecture" },
    ]);
    expect(derived.plainText).toContain(
      "Bold italic old const\ninternal and external",
    );
    expect(derived.plainText).toContain("Quoted guidance.");
    expect(derived.plainText).toContain("Nested item");
    expect(derived.plainText).toContain("System architecture");
    expect(derived.plainText).toContain(
      'const value: string = "<main>safe</main>";',
    );
    expect(derived.readingMinutes).toBe(1);
  });

  it("renders every schema v1 node and mark through the public API", async () => {
    const markup = renderToStaticMarkup(
      await ArticleContent({ document: completeArticle, mediaById }),
    );

    expect(markup).toContain('<article data-article-content="">');
    expect(markup).toContain('<h2 id="architecture">Architecture</h2>');
    expect(markup).toContain("<strong>Bold</strong>");
    expect(markup).toContain("<em> italic</em>");
    expect(markup).toContain("<s> old</s>");
    expect(markup).toContain("<code> const</code><br/>");
    expect(markup).toContain('<a href="/blog/next">internal</a>');
    expect(markup).toContain(
      '<a href="https://example.com" rel="noopener noreferrer" target="_blank">external</a>',
    );
    expect(markup).toContain("<blockquote>");
    expect(markup).toContain('<ol start="3">');
    expect(markup).toContain("<ul><li><p>Nested item</p></li></ul>");
    expect(markup).toContain("<hr/>");
    expect(markup).toContain(
      '<figure data-media-id="med_architecture"><img alt="System architecture diagram" decoding="async" height="900" loading="lazy" src="/media/architecture.webp" width="1600"/><figcaption>System architecture</figcaption></figure>',
    );
    expect(markup).toContain('<figure data-code-block="">');
    expect(markup).toContain("<span>typescript</span>");
    expect(markup).toContain("Copy code");
    expect(markup).toContain('data-code-line=""');
    expect(markup).not.toContain("<main>safe</main>");
    expect(markup).not.toContain("ProseMirror");
    expect(markup).not.toContain("@tiptap");
  });
});
