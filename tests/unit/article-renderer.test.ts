import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { ArticleDocument } from "@/features/post/content/types";
import { validArticleFixtures } from "@/features/post/content/fixtures";
import { ArticleContent } from "@/features/post/content/render/article-content";
import type { ArticleMediaMap } from "@/features/post/content/render/media";

async function renderArticle(
  document: ArticleDocument,
  mediaById: ArticleMediaMap = {},
): Promise<string> {
  return renderToStaticMarkup(await ArticleContent({ document, mediaById }));
}

describe("article renderer", () => {
  it("renders the article root and stable heading anchors", async () => {
    const markup = await renderArticle(validArticleFixtures.headings);

    expect(markup).toContain('<article data-article-content="">');
    expect(markup).toContain('<h2 id="intro">前言</h2>');
    expect(markup).toContain('<h3 id="detail">细节</h3>');
    expect(markup).toContain('<h4 id="edge-case">边界情况</h4>');
  });

  it("renders semantic marks and hard breaks", async () => {
    const marks = await renderArticle(validArticleFixtures.marks);
    const hardBreak = await renderArticle(validArticleFixtures.hardBreak);

    expect(marks).toContain("<strong>bold</strong>");
    expect(marks).toContain("<em>italic</em>");
    expect(marks).toContain("<s>strike</s>");
    expect(marks).toContain("<code>code</code>");
    expect(marks).toContain("<em><strong>both</strong></em>");
    expect(hardBreak).toContain("first line<br/>second line");
  });

  it("adds new-window protection only to external HTTP links", async () => {
    const markup = await renderArticle(validArticleFixtures.links);

    expect(markup).toContain('<a href="/blog/hello">relative</a>');
    expect(markup).toContain('<a href="#intro">anchor</a>');
    expect(markup).toContain(
      '<a href="https://example.com" rel="noopener noreferrer" target="_blank">https</a>',
    );
    expect(markup).toContain(
      '<a href="http://example.com" rel="noopener noreferrer" target="_blank">http</a>',
    );
    expect(markup).toContain('<a href="mailto:me@example.com">mailto</a>');
  });

  it("renders recursive quotes and lists in document order", async () => {
    const quote = await renderArticle(validArticleFixtures.richBlockquote);
    const lists = await renderArticle(validArticleFixtures.nestedLists);

    expect(quote).toContain(
      '<blockquote><p>quoted</p><ul><li><p>quoted item</p></li></ul><pre data-language="go"><code>a := 1</code></pre><hr/></blockquote>',
    );
    expect(lists).toContain(
      "<ul><li><p>one</p></li><li><p>two</p><ul><li><p>nested</p></li></ul></li></ul>",
    );
  });

  it("preserves ordered-list starts and renders resolved media", async () => {
    const mediaById = {
      med_01: {
        url: "/media/cat.webp",
        width: 1200,
        height: 800,
        blurhash: "LEHV6nWB2yk8pyo0adR*.7kCMdnj",
      },
      med_02: {
        url: "/media/decorative.webp",
        width: 640,
        height: 480,
      },
    } satisfies ArticleMediaMap;
    const ordered = await renderArticle(
      validArticleFixtures.orderedListWithStart,
    );
    const image = await renderArticle(validArticleFixtures.image, mediaById);
    const decorativeImage = await renderArticle(
      validArticleFixtures.decorativeImage,
      mediaById,
    );
    const code = await renderArticle(validArticleFixtures.codeBlocks);

    expect(ordered).toContain('<ol start="3"><li><p>third</p></li></ol>');
    expect(image).toContain(
      '<figure data-media-id="med_01"><img alt="a grey cat" decoding="async" height="800" loading="lazy" src="/media/cat.webp" width="1200"/><figcaption>My cat</figcaption></figure>',
    );
    expect(decorativeImage).toContain(
      '<figure data-media-id="med_02"><img alt="" decoding="async" height="480" loading="lazy" src="/media/decorative.webp" width="640"/></figure>',
    );
    expect(code).toContain(
      '<pre data-language="typescript"><code>const a = 1;</code></pre>',
    );
  });

  it("renders a safe fallback when referenced media is unavailable", async () => {
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const markup = await renderArticle(validArticleFixtures.image);

    expect(error).toHaveBeenCalledWith(
      "Article image media is unavailable.",
      "med_01",
    );
    expect(markup).toContain(
      '<figure data-media-id="med_01"><div role="note">Image unavailable.</div></figure>',
    );
    expect(markup).not.toContain("a grey cat");
    expect(markup).not.toContain("My cat");
  });

  it("renders a non-sensitive fallback for unsupported runtime nodes", async () => {
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const document = {
      type: "doc",
      content: [
        {
          type: "video",
          attrs: { html: "<script>private()</script>" },
        },
      ],
    } as unknown as ArticleDocument;

    const markup = await renderArticle(document);

    expect(error).toHaveBeenCalledWith(
      "Unsupported article node type.",
      "video",
    );
    expect(markup).toContain(
      '<div role="note">Unsupported article content.</div>',
    );
    expect(markup).not.toContain("private");
    expect(markup).not.toContain("script");
  });
});
