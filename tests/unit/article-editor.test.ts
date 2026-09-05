import { getSchema } from "@tiptap/core";
import { describe, expect, it } from "vitest";

import { validateArticleDocument } from "@/features/post";
import { articleEditorExtensions } from "@/features/post/content/editor/extensions";
import {
  normalizeEditorDocument,
  PERSISTED_MARK_ATTRIBUTES,
  PERSISTED_NODE_ATTRIBUTES,
} from "@/features/post/content/editor/normalize";

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

  // Matching node names is not enough: StarterKit's own content expressions
  // let the editor build quotes and list items the shared schema rejects.
  it("registers the v1 content expressions", () => {
    const expressions = Object.fromEntries(
      Object.keys(schema.nodes)
        .sort()
        .map((name) => [name, schema.nodes[name].spec.content]),
    );

    expect(expressions).toEqual({
      blockquote:
        "(paragraph | bulletList | orderedList | codeBlock | horizontalRule)+",
      bulletList: "listItem+",
      codeBlock: "text*",
      doc: "block+",
      hardBreak: undefined,
      heading: "inline*",
      horizontalRule: undefined,
      image: undefined,
      listItem: "paragraph (paragraph | bulletList | orderedList | codeBlock)*",
      orderedList: "listItem+",
      paragraph: "inline*",
      text: undefined,
    });
  });

  const paragraphNode = () =>
    schema.nodes.paragraph.create(null, schema.text("x"));
  const codeBlockNode = () =>
    schema.nodes.codeBlock.create({ language: "go" }, schema.text("a := 1"));

  function buildsSuccessfully(build: () => unknown): boolean {
    try {
      build();
      return true;
    } catch {
      return false;
    }
  }

  it.each([
    [
      "a heading inside a quote",
      () =>
        schema.nodes.blockquote.createChecked(null, [
          schema.nodes.heading.create({ level: 2, id: "q" }, schema.text("H")),
        ]),
    ],
    [
      "a quote inside a quote",
      () =>
        schema.nodes.blockquote.createChecked(null, [
          schema.nodes.blockquote.create(null, [paragraphNode()]),
        ]),
    ],
    [
      "an image inside a list item",
      () =>
        schema.nodes.listItem.createChecked(null, [
          paragraphNode(),
          schema.nodes.image.create({ mediaId: "m1", alt: "a" }),
        ]),
    ],
    [
      "a list item that opens with a code block",
      () => schema.nodes.listItem.createChecked(null, [codeBlockNode()]),
    ],
  ])("refuses %s", (_name, build) => {
    expect(buildsSuccessfully(build)).toBe(false);
  });

  it.each([
    [
      "a quote holding prose, a list, code, and a rule",
      () =>
        schema.nodes.blockquote.createChecked(null, [
          paragraphNode(),
          schema.nodes.bulletList.create(null, [
            schema.nodes.listItem.create(null, paragraphNode()),
          ]),
          codeBlockNode(),
          schema.nodes.horizontalRule.create(),
        ]),
    ],
    [
      "a list item holding two paragraphs, code, and a nested list",
      () =>
        schema.nodes.listItem.createChecked(null, [
          paragraphNode(),
          paragraphNode(),
          codeBlockNode(),
          schema.nodes.bulletList.create(null, [
            schema.nodes.listItem.create(null, paragraphNode()),
          ]),
        ]),
    ],
  ])("accepts %s", (_name, build) => {
    expect(buildsSuccessfully(build)).toBe(true);
  });
});

describe("editor attribute drift", () => {
  function attributeNames(spec: { attrs?: Record<string, unknown> }): string[] {
    return Object.keys(spec.attrs ?? {}).sort();
  }

  // A new extension version can add attributes that normalisation would drop
  // in silence. Pinning the full set forces that change to be looked at.
  it("registers exactly the known node attributes", () => {
    const attributes = Object.fromEntries(
      Object.keys(schema.nodes)
        .filter((name) => schema.nodes[name].spec.attrs)
        .sort()
        .map((name) => [name, attributeNames(schema.nodes[name].spec)]),
    );

    expect(attributes).toEqual({
      codeBlock: ["language"],
      heading: ["id", "level"],
      image: ["alt", "caption", "mediaId"],
      // start is persisted; type is a presentation attribute normalisation drops.
      orderedList: ["start", "type"],
    });
  });

  it("registers exactly the known mark attributes", () => {
    const attributes = Object.fromEntries(
      Object.keys(schema.marks)
        .filter((name) => schema.marks[name].spec.attrs)
        .sort()
        .map((name) => [name, attributeNames(schema.marks[name].spec)]),
    );

    expect(attributes).toEqual({
      // Only href is persisted; the rest are link presentation defaults.
      link: ["class", "href", "rel", "target", "title"],
    });
  });

  it("only persists attributes the editor actually produces", () => {
    for (const [node, attributes] of Object.entries(
      PERSISTED_NODE_ATTRIBUTES,
    )) {
      expect(attributeNames(schema.nodes[node].spec)).toEqual(
        expect.arrayContaining([...attributes]),
      );
    }

    for (const [mark, attributes] of Object.entries(
      PERSISTED_MARK_ATTRIBUTES,
    )) {
      expect(attributeNames(schema.marks[mark].spec)).toEqual(
        expect.arrayContaining([...attributes]),
      );
    }
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
