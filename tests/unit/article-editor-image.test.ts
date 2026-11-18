// @vitest-environment happy-dom
import { Editor } from "@tiptap/core";
import { afterEach, describe, expect, it } from "vitest";

import { validateArticleDocument, type ArticleDocument } from "@/features/post";
import {
  articleEditorExtensions,
  createArticleEditorExtensions,
} from "@/features/post/content/editor/extensions";
import { normalizeEditorDocument } from "@/features/post/content/editor/normalize";

const STORED: ArticleDocument = {
  type: "doc",
  content: [
    { type: "paragraph", content: [{ type: "text", text: "Before." }] },
    {
      type: "image",
      attrs: { mediaId: "med_01", alt: "A cat", caption: "Asleep." },
    },
    // The editor keeps a text block after a final atom so the cursor has
    // somewhere to go. Ending on a paragraph keeps that out of these tests.
    { type: "paragraph", content: [{ type: "text", text: "After." }] },
  ],
};

let editor: Editor;

function open(content: ArticleDocument, extensions = articleEditorExtensions) {
  editor = new Editor({
    element: document.createElement("div"),
    extensions,
    content,
  });

  return editor;
}

function saved(): ArticleDocument {
  const result = validateArticleDocument(
    normalizeEditorDocument(editor.getJSON()),
  );
  if (!result.ok) throw new Error(JSON.stringify(result.issues));

  return result.document;
}

afterEach(() => editor.destroy());

describe("image node in the editor", () => {
  it("shows a stored image as a labelled placeholder with its caption", () => {
    const figure = open(STORED).view.dom.querySelector("figure")!;

    expect(figure.getAttribute("data-media-id")).toBe("med_01");
    expect(figure.querySelector("[data-image-placeholder]")?.textContent).toBe(
      "Image: A cat",
    );
    expect(figure.querySelector("figcaption")?.textContent).toBe("Asleep.");
  });

  it("labels a decorative image by its media id and omits the caption", () => {
    const figure = open({
      type: "doc",
      content: [{ type: "image", attrs: { mediaId: "med_02", alt: "" } }],
    }).view.dom.querySelector("figure")!;

    expect(figure.querySelector("[data-image-placeholder]")?.textContent).toBe(
      "Image med_02",
    );
    expect(figure.querySelector("figcaption")).toBeNull();
  });

  it("round-trips a stored image without persisting the placeholder", () => {
    open(STORED);

    expect(saved()).toEqual(STORED);
  });

  it("inserts an image node that references stored media", () => {
    open(STORED);

    const inserted = editor
      .chain()
      .setTextSelection(8)
      .insertArticleImage({ mediaId: "med_03", alt: "A dog" })
      .run();

    expect(inserted).toBe(true);
    expect(saved().content).toEqual([
      STORED.content[0],
      { type: "image", attrs: { mediaId: "med_03", alt: "A dog" } },
      STORED.content[1],
      STORED.content[2],
    ]);
  });

  it("refuses to insert an image without a media id", () => {
    open(STORED);

    expect(editor.commands.insertArticleImage({ mediaId: " ", alt: "" })).toBe(
      false,
    );
    expect(saved()).toEqual(STORED);
  });

  it("does not insert an image where the schema forbids one", () => {
    open({
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Item" }],
                },
              ],
            },
          ],
        },
      ],
    });

    editor
      .chain()
      .setTextSelection(5)
      .insertArticleImage({ mediaId: "med_04", alt: "" })
      .run();

    // Whatever the editor does with the request, the result stays valid:
    // schema v1 has no image inside a list item.
    const list = saved().content[0];
    expect(JSON.stringify(list)).not.toContain("med_04");
  });

  it("shows the image itself when its display URL is known", () => {
    const urls: Record<string, string> = {
      med_01: "/media/med_01.jpg?w=1600",
    };
    const figure = open(
      STORED,
      createArticleEditorExtensions(urls),
    ).view.dom.querySelector("figure")!;
    const img = figure.querySelector("img")!;

    expect(img.getAttribute("src")).toBe("/media/med_01.jpg?w=1600");
    expect(img.getAttribute("alt")).toBe("A cat");
    expect(figure.querySelector("[data-image-placeholder]")).toBeNull();
    expect(figure.querySelector("figcaption")?.textContent).toBe("Asleep.");
    expect(saved()).toEqual(STORED);
  });

  it("shows an image inserted after its URL was registered", () => {
    const urls: Record<string, string> = {};
    open(STORED, createArticleEditorExtensions(urls));

    urls.med_05 = "/media/med_05.png?w=1600";
    editor
      .chain()
      .setTextSelection(8)
      .insertArticleImage({ mediaId: "med_05", alt: "" })
      .run();

    const img = editor.view.dom.querySelector('[data-media-id="med_05"] img');
    expect(img?.getAttribute("src")).toBe("/media/med_05.png?w=1600");
  });

  it("sets the alt text of an inserted image", () => {
    open(STORED);

    expect(editor.commands.setArticleImageAlt("med_01", "A sleeping cat")).toBe(
      true,
    );
    expect(saved().content[1]).toEqual({
      type: "image",
      attrs: { mediaId: "med_01", alt: "A sleeping cat", caption: "Asleep." },
    });
  });

  it("reports a missing image when setting alt text", () => {
    open(STORED);

    expect(editor.commands.setArticleImageAlt("med_99", "x")).toBe(false);
    expect(saved()).toEqual(STORED);
  });
});
