// @vitest-environment happy-dom
import type { Editor } from "@tiptap/core";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { validateArticleDocument, type ArticleDocument } from "@/features/post";
import ArticleEditor from "@/features/post/content/editor/article-editor";

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

async function mount(initialDocument: ArticleDocument) {
  await act(async () =>
    root.render(
      createElement(ArticleEditor, {
        initialDocument,
        name: "content",
        labelledBy: "label",
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
