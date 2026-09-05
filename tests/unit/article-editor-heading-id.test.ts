// @vitest-environment happy-dom
import { Editor } from "@tiptap/core";
import { afterEach, describe, expect, it } from "vitest";

import { validateArticleDocument } from "@/features/post";
import { articleEditorExtensions } from "@/features/post/content/editor/extensions";
import { normalizeEditorDocument } from "@/features/post/content/editor/normalize";

const HEADING_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

type HeadingJson = { type: string; attrs?: { id?: unknown } };

let editor: Editor | undefined;

function createEditor(): Editor {
  editor = new Editor({
    extensions: articleEditorExtensions,
    content: { type: "doc", content: [{ type: "paragraph" }] },
  });
  return editor;
}

function headings(instance: Editor): HeadingJson[] {
  const document = instance.getJSON() as { content?: HeadingJson[] };
  return (document.content ?? []).filter((node) => node.type === "heading");
}

function headingIds(instance: Editor): unknown[] {
  return headings(instance).map((node) => node.attrs?.id);
}

afterEach(() => {
  editor?.destroy();
  editor = undefined;
});

describe("heading id assignment", () => {
  it("assigns an id to a heading that arrives without one", () => {
    const instance = createEditor();

    instance.commands.setContent({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Intro" }],
        },
      ],
    });

    const [id] = headingIds(instance);
    expect(typeof id).toBe("string");
    expect(id).toMatch(HEADING_ID_PATTERN);
  });

  it("gives every heading a distinct id", () => {
    const instance = createEditor();

    instance.commands.setContent({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "A" }],
        },
        {
          type: "heading",
          attrs: { level: 3 },
          content: [{ type: "text", text: "B" }],
        },
        {
          type: "heading",
          attrs: { level: 4 },
          content: [{ type: "text", text: "C" }],
        },
      ],
    });

    const ids = headingIds(instance);
    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(3);
  });

  it("keeps the id when the heading text changes", () => {
    const instance = createEditor();

    instance.commands.setContent({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Intro" }],
        },
      ],
    });
    const [before] = headingIds(instance);

    // Append to the heading text; the anchor must survive a retitle.
    instance.commands.insertContentAt(6, "duction");

    const [after] = headingIds(instance);
    expect(headings(instance)[0]).toMatchObject({ type: "heading" });
    expect(instance.getText()).toContain("Introduction");
    expect(after).toBe(before);
  });

  it("keeps an id that is already valid", () => {
    const instance = createEditor();

    instance.commands.setContent({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2, id: "kept-id" },
          content: [{ type: "text", text: "Intro" }],
        },
      ],
    });

    expect(headingIds(instance)).toEqual(["kept-id"]);
  });

  it("replaces a duplicated id, as a copy and paste produces", () => {
    const instance = createEditor();

    instance.commands.setContent({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2, id: "same" },
          content: [{ type: "text", text: "A" }],
        },
        {
          type: "heading",
          attrs: { level: 3, id: "same" },
          content: [{ type: "text", text: "B" }],
        },
      ],
    });

    const ids = headingIds(instance);
    expect(ids[0]).toBe("same");
    expect(ids[1]).not.toBe("same");
    expect(ids[1]).toMatch(HEADING_ID_PATTERN);
  });

  it("keeps the original id when a copy is pasted above it", () => {
    const instance = createEditor();

    instance.commands.setContent({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2, id: "original-id" },
          content: [{ type: "text", text: "ORIGINAL" }],
        },
      ],
    });

    instance.commands.insertContentAt(0, {
      type: "heading",
      attrs: { level: 2, id: "original-id" },
      content: [{ type: "text", text: "COPY" }],
    });

    const [copy, original] = headings(instance);
    expect(instance.getText()).toContain("COPY");
    // The anchor must follow the heading that already existed, not the copy
    // that happens to sit first in the document.
    expect(original.attrs?.id).toBe("original-id");
    expect(copy.attrs?.id).not.toBe("original-id");
    expect(copy.attrs?.id).toMatch(HEADING_ID_PATTERN);
  });

  it("keeps the original id when a copy is pasted between headings", () => {
    const instance = createEditor();

    instance.commands.setContent({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2, id: "first" },
          content: [{ type: "text", text: "FIRST" }],
        },
        {
          type: "heading",
          attrs: { level: 2, id: "second" },
          content: [{ type: "text", text: "SECOND" }],
        },
      ],
    });

    instance.commands.insertContentAt(0, {
      type: "heading",
      attrs: { level: 2, id: "second" },
      content: [{ type: "text", text: "COPY OF SECOND" }],
    });

    const byText = new Map(
      headings(instance).map((node) => [
        (node as { content?: { text?: string }[] }).content?.[0]?.text,
        node.attrs?.id,
      ]),
    );

    expect(byText.get("FIRST")).toBe("first");
    expect(byText.get("SECOND")).toBe("second");
    expect(byText.get("COPY OF SECOND")).not.toBe("second");
  });

  it("replaces an id the shared schema would reject", () => {
    const instance = createEditor();

    instance.commands.setContent({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2, id: "a/b" },
          content: [{ type: "text", text: "A" }],
        },
      ],
    });

    const [id] = headingIds(instance);
    expect(id).not.toBe("a/b");
    expect(id).toMatch(HEADING_ID_PATTERN);
  });
});

describe("editor output round trip", () => {
  it("passes validation after normalisation", () => {
    const instance = createEditor();

    instance.commands.setContent({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "标题" }],
        },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "正文与" },
            {
              type: "text",
              text: "链接",
              marks: [{ type: "link", attrs: { href: "https://example.com" } }],
            },
          ],
        },
        {
          type: "orderedList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "第一项" }],
                },
              ],
            },
          ],
        },
        { type: "image", attrs: { mediaId: "med_01", alt: "猫" } },
        {
          type: "codeBlock",
          attrs: { language: "python" },
          content: [{ type: "text", text: "print(1)" }],
        },
      ],
    });

    const raw = instance.getJSON();
    const result = validateArticleDocument(normalizeEditorDocument(raw));

    expect(result.ok).toBe(true);
  });

  it("produces an empty draft the shared schema accepts", () => {
    const instance = createEditor();

    const result = validateArticleDocument(
      normalizeEditorDocument(instance.getJSON()),
    );

    expect(result.ok).toBe(true);
  });
});
