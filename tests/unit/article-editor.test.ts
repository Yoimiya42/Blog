import { getSchema } from "@tiptap/core";
import { describe, expect, it } from "vitest";

import { validateArticleDocument } from "@/features/post";
import { articleEditorExtensions } from "@/features/post/content/editor/extensions";
import { normalizeEditorDocument } from "@/features/post/content/editor/normalize";

const schema = getSchema(articleEditorExtensions);

const SCHEMA_V1_NODES = [
  "blockquote",
  "bulletList",
  "codeBlock",
  "doc",
  "hardBreak",
  "heading",
  "horizontalRule",
  "image",
  "listItem",
  "orderedList",
  "paragraph",
  "text",
];

const SCHEMA_V1_MARKS = ["bold", "code", "italic", "link", "strike"];

describe("editor schema matches schema v1", () => {
  it("registers exactly the v1 nodes", () => {
    expect(Object.keys(schema.nodes).sort()).toEqual(SCHEMA_V1_NODES);
  });

  it("registers exactly the v1 marks", () => {
    expect(Object.keys(schema.marks).sort()).toEqual(SCHEMA_V1_MARKS);
  });

  it("defaults a heading to a level schema v1 accepts", () => {
    expect(schema.nodes.heading.spec.attrs?.level.default).toBe(2);
  });

  it("defaults a code block to a bundled language", () => {
    expect(schema.nodes.codeBlock.spec.attrs?.language.default).toBe(
      "plaintext",
    );
  });
});

describe("normalizeEditorDocument", () => {
  const paragraph = (text: string) =>
    schema.nodes.paragraph.create(null, schema.text(text));

  const editorDocument = schema.nodes.doc.create(null, [
    schema.nodes.heading.create(
      { level: 2, id: "abc123" },
      schema.text("Intro"),
    ),
    schema.nodes.paragraph.create(null, [
      schema.text("visit "),
      schema.text("here", [
        schema.marks.link.create({ href: "https://example.com" }),
      ]),
    ]),
    schema.nodes.orderedList.create(null, [
      schema.nodes.listItem.create(null, paragraph("first")),
    ]),
    schema.nodes.image.create({ mediaId: "med_01", alt: "a cat" }),
    schema.nodes.image.create({
      mediaId: "med_02",
      alt: "a dog",
      caption: "Rex",
    }),
    schema.nodes.codeBlock.create({ language: "go" }, schema.text("a := 1")),
  ]);

  const raw = editorDocument.toJSON();

  it("rejects raw editor output, which carries presentation attributes", () => {
    const result = validateArticleDocument(raw);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    const paths = result.issues.map((issue) => issue.path);
    expect(paths).toContain("content.1.content.1.marks.0.attrs");
    expect(paths).toContain("content.2.attrs");
    expect(paths).toContain("content.3.attrs.caption");
  });

  it("accepts the same document after normalisation", () => {
    expect(validateArticleDocument(normalizeEditorDocument(raw)).ok).toBe(true);
  });

  it("keeps only the href on a link mark", () => {
    const normalized = normalizeEditorDocument({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "x",
              marks: [
                {
                  type: "link",
                  attrs: {
                    href: "/blog/hello",
                    target: "_blank",
                    rel: "noopener",
                    class: null,
                    title: null,
                  },
                },
              ],
            },
          ],
        },
      ],
    });

    expect(normalized).toEqual({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "x",
              marks: [{ type: "link", attrs: { href: "/blog/hello" } }],
            },
          ],
        },
      ],
    });
  });

  it("drops an unset optional attribute instead of writing null", () => {
    const normalized = normalizeEditorDocument({
      type: "doc",
      content: [
        { type: "image", attrs: { mediaId: "m1", alt: "cat", caption: null } },
      ],
    });

    expect(normalized).toEqual({
      type: "doc",
      content: [{ type: "image", attrs: { mediaId: "m1", alt: "cat" } }],
    });
  });

  it("drops an attrs object that ends up empty", () => {
    const normalized = normalizeEditorDocument({
      type: "doc",
      content: [
        {
          type: "orderedList",
          attrs: { start: null, type: null },
          content: [],
        },
      ],
    });

    expect(normalized).toEqual({
      type: "doc",
      content: [{ type: "orderedList", content: [] }],
    });
  });

  it("passes an unknown node through so validation still rejects it", () => {
    const input = {
      type: "doc",
      content: [{ type: "video", attrs: { src: "clip.mp4" } }],
    };

    const normalized = normalizeEditorDocument(input);

    expect(normalized).toEqual({
      type: "doc",
      content: [{ type: "video" }],
    });
    expect(validateArticleDocument(normalized).ok).toBe(false);
  });
});
