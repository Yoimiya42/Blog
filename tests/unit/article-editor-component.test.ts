// @vitest-environment happy-dom
import type { Editor } from "@tiptap/core";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { validateArticleDocument, type ArticleDocument } from "@/features/post";
import ArticleEditor from "@/features/post/content/editor/article-editor";
import type { ImageUploadConfig } from "@/features/post/content/image-upload";

const STORED: ArticleDocument = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 2, id: "intro" },
      content: [{ type: "text", text: "Intro" }],
    },
    { type: "paragraph", content: [{ type: "text", text: "Body." }] },
  ],
};

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

async function mount(
  initialDocument: ArticleDocument,
  imageUpload?: ImageUploadConfig,
) {
  await act(async () =>
    root.render(
      createElement(ArticleEditor, {
        initialDocument,
        name: "content",
        labelledBy: "label",
        imageUpload,
      }),
    ),
  );

  const field = container.querySelector<HTMLInputElement>(
    'input[name="content"]',
  )!;
  // TipTap attaches the instance to its editable element.
  const editable = container.querySelector(".ProseMirror") as
    (HTMLElement & { editor: Editor }) | null;

  return { field, editor: editable!.editor, editable: editable! };
}

function submitted(field: HTMLInputElement): unknown {
  return JSON.parse(field.value) as unknown;
}

describe("article editor form field", () => {
  it("submits the stored document unchanged until it is edited", async () => {
    const { field, editable } = await mount(STORED);

    expect(submitted(field)).toEqual(STORED);
    expect(editable.textContent).toBe("IntroBody.");
    expect(editable.getAttribute("aria-labelledby")).toBe("label");
  });

  it("submits a normalised schema v1 document after an edit", async () => {
    const { field, editor } = await mount(STORED);

    await act(async () => {
      editor
        .chain()
        .focus("end")
        .insertContent({ type: "heading", attrs: { level: 3 } })
        .insertContent("Next")
        .run();
    });

    const document = submitted(field);
    const result = validateArticleDocument(document);
    expect(result.ok, JSON.stringify(document)).toBe(true);
    if (!result.ok) return;

    const [first, , third] = result.document.content;
    // The stored heading keeps its id; the new one receives its own.
    expect(first).toMatchObject({ type: "heading", attrs: { id: "intro" } });
    expect(third).toMatchObject({
      type: "heading",
      attrs: { level: 3, id: expect.stringMatching(/^[0-9a-f]{12}$/) },
      content: [{ type: "text", text: "Next" }],
    });
  });
});

describe("article editor library picker", () => {
  const LIBRARY = [
    {
      id: "libmedia000000000001",
      url: "/media/libmedia000000000001.jpg?w=1600",
      thumbnailUrl: "/media/libmedia000000000001.jpg?w=480",
      alt: "Harbour at dusk",
      width: 1200,
      height: 800,
    },
  ];

  function button(text: string): HTMLButtonElement {
    const found = [...container.querySelectorAll("button")].find(
      (element) =>
        element.textContent === text ||
        element.getAttribute("aria-label") === text,
    );
    if (!found) throw new Error(`no button: ${text}`);
    return found;
  }

  it("inserts an existing library image as a media reference", async () => {
    const loadLibrary = vi.fn(async () => LIBRARY);
    const { field } = await mount(STORED, {
      path: "/api/media",
      altHeader: "X-Media-Alt",
      maxBytes: 1,
      loadLibrary,
    });

    await act(async () => button("Insert image").click());
    await act(async () => button("Choose from library").click());
    expect(loadLibrary).toHaveBeenCalledOnce();

    await act(async () => button("Insert Harbour at dusk").click());

    const document = submitted(field) as ArticleDocument;
    expect(document.content).toContainEqual({
      type: "image",
      attrs: { mediaId: "libmedia000000000001", alt: "Harbour at dusk" },
    });
    expect(
      container.querySelector('.ProseMirror img[src$="w=1600"]'),
    ).not.toBeNull();
    expect(container.textContent).toContain("Image inserted.");
  });

  it("hides the library button without a loader", async () => {
    await mount(STORED, {
      path: "/api/media",
      altHeader: "X-Media-Alt",
      maxBytes: 1,
    });

    await act(async () => button("Insert image").click());
    expect(container.textContent).not.toContain("Choose from library");
  });
});
