import { describe, expect, it } from "vitest";

import {
  CODE_LANGUAGES,
  CONTENT_SCHEMA_VERSION,
  parseArticleDocument,
  validateArticleDocument,
} from "@/features/post";
import {
  invalidArticleFixtures,
  validArticleFixtures,
} from "@/features/post/content/fixtures";

const documentWithHref = (href: string) => ({
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "link",
          marks: [{ type: "link", attrs: { href } }],
        },
      ],
    },
  ],
});

const documentWithLanguage = (language: string) => ({
  type: "doc",
  content: [
    {
      type: "codeBlock",
      attrs: { language },
      content: [{ type: "text", text: "sample" }],
    },
  ],
});

const heading = (id: string, level = 2) => ({
  type: "heading",
  attrs: { level, id },
  content: [{ type: "text", text: id }],
});

describe("validateArticleDocument", () => {
  it.each(Object.entries(validArticleFixtures))(
    "accepts %s",
    (_name, document) => {
      expect(validateArticleDocument(document).ok).toBe(true);
    },
  );

  it.each(Object.entries(invalidArticleFixtures))(
    "rejects %s",
    (_name, fixture) => {
      expect(validateArticleDocument(fixture.document).ok).toBe(false);
    },
  );

  it("returns the document unchanged", () => {
    const result = validateArticleDocument(validArticleFixtures.marks);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document).toEqual(validArticleFixtures.marks);
  });

  it("reports every issue in one pass", () => {
    const result = validateArticleDocument({
      type: "doc",
      content: [
        documentWithHref("javascript:alert(1)").content[0],
        documentWithLanguage("rust").content[0],
      ],
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues).toHaveLength(2);
  });

  it("points an issue at the offending node", () => {
    const result = validateArticleDocument(
      documentWithHref("javascript:alert(1)"),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues[0].path).toBe(
      "content.0.content.0.marks.0.attrs.href",
    );
    expect(result.issues[0].message).toBe("unsupported link target");
  });
});

describe("heading ids", () => {
  it("reports each duplicated id once", () => {
    const result = validateArticleDocument({
      type: "doc",
      content: [
        heading("intro"),
        heading("detail", 3),
        heading("intro", 3),
        heading("intro", 4),
      ],
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues).toEqual([
      { path: "content", message: "duplicate heading id: intro" },
    ]);
  });

  it("reports several duplicated ids together", () => {
    const result = validateArticleDocument({
      type: "doc",
      content: [heading("a"), heading("b"), heading("a", 3), heading("b", 3)],
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues).toHaveLength(2);
  });

  it("allows the same id in different documents", () => {
    const first = validateArticleDocument({
      type: "doc",
      content: [heading("intro")],
    });
    const second = validateArticleDocument({
      type: "doc",
      content: [heading("intro")],
    });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
  });
});

describe("link protocols", () => {
  it.each([
    "/blog/hello",
    "/blog/hello#section",
    "#section",
    "https://example.com/a?b=c",
    "http://example.com",
    "mailto:me@example.com",
  ])("accepts %s", (href) => {
    expect(validateArticleDocument(documentWithHref(href)).ok).toBe(true);
  });

  it.each([
    "javascript:alert(1)",
    "JavaScript:alert(1)",
    "  javascript:alert(1)",
    "java\tscript:alert(1)",
    "java\nscript:alert(1)",
    "data:text/html,<b>x</b>",
    "vbscript:msgbox(1)",
    "//example.com/steal",
    "ftp://example.com",
    "not a url",
    "",
  ])("rejects %j", (href) => {
    expect(validateArticleDocument(documentWithHref(href)).ok).toBe(false);
  });

  // Site-relative hrefs bypass URL normalisation, so they must arrive clean.
  it.each([
    "/blog/hello ",
    " /blog/hello",
    "#section ",
    "/blog\thello",
    "/blog\nhello",
    " https://example.com",
  ])("rejects unnormalised %j", (href) => {
    expect(validateArticleDocument(documentWithHref(href)).ok).toBe(false);
  });
});

describe("code block languages", () => {
  it.each(CODE_LANGUAGES)("accepts %s", (language) => {
    expect(validateArticleDocument(documentWithLanguage(language)).ok).toBe(
      true,
    );
  });

  it.each(["rust", "sql", "PYTHON", ""])("rejects %j", (language) => {
    expect(validateArticleDocument(documentWithLanguage(language)).ok).toBe(
      false,
    );
  });
});

describe("parseArticleDocument", () => {
  it("returns the document for valid input", () => {
    expect(parseArticleDocument(validArticleFixtures.emptyDraft)).toEqual(
      validArticleFixtures.emptyDraft,
    );
  });

  it("throws for invalid input", () => {
    expect(() =>
      parseArticleDocument(invalidArticleFixtures.emptyDocument.document),
    ).toThrow(/invalid article document/);
  });

  it("names the failing rule in the thrown message", () => {
    expect(() =>
      parseArticleDocument(documentWithHref("javascript:alert(1)")),
    ).toThrow(/unsupported link target/);
  });
});

describe("schema version", () => {
  it("is version 1", () => {
    expect(CONTENT_SCHEMA_VERSION).toBe(1);
  });
});
