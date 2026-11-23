// @vitest-environment happy-dom
import type { Editor } from "@tiptap/core";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ArticleDocument } from "@/features/post";
import ArticleEditor from "@/features/post/content/editor/article-editor";
import { highlightCode } from "@/features/post/content/render/highlight";

const CODE = "def add(a, b):\n    return a + b";

const DOCUMENT: ArticleDocument = {
  type: "doc",
  content: [
    {
      type: "codeBlock",
      attrs: { language: "python" },
      content: [{ type: "text", text: CODE }],
    },
    {
      type: "codeBlock",
      attrs: { language: "plaintext" },
      content: [{ type: "text", text: "plain" }],
    },
  ],
};

let root: Root;
let element: HTMLDivElement;

beforeEach(async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  element = document.createElement("div");
  document.body.appendChild(element);
  root = createRoot(element);
  await act(async () =>
    root.render(
      createElement(ArticleEditor, {
        initialDocument: DOCUMENT,
        name: "content",
        labelledBy: "label",
      }),
    ),
  );
});

afterEach(async () => {
  await act(async () => root.unmount());
  element.remove();
  vi.unstubAllGlobals();
});

/** Colour of each non-empty span the editor painted, in document order. */
function paintedColours(element: HTMLElement): string[] {
  return [...element.querySelectorAll<HTMLElement>("pre span[style]")]
    .filter((span) => span.textContent !== "")
    .map((span) => span.style.color.toLowerCase());
}

async function waitFor(check: () => boolean, timeoutMs = 10_000) {
  const end = Date.now() + timeoutMs;
  while (!check()) {
    if (Date.now() > end) throw new Error("timed out");
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

describe("editor code highlighting", () => {
  it("paints the server's colours without changing the stored document", async () => {
    // The grammar loads on demand, then the editor repaints.
    await act(async () => {
      await waitFor(() => paintedColours(element).length > 0);
    });

    const server = await highlightCode(CODE, "python");
    const expected = server.tokens
      .flat()
      .filter((token) => token.content !== "" && token.color)
      .map((token) => token.color!.toLowerCase());
    // happy-dom keeps the hex value as written.
    expect(paintedColours(element)).toEqual(expected);

    // Plain text gets no decorations.
    const plain = element.querySelectorAll("pre")[1];
    expect(plain.querySelector("span[style]")).toBeNull();

    const editor = (
      element.querySelector(".ProseMirror") as HTMLElement & { editor: Editor }
    ).editor;
    // The editor appends an empty paragraph after a trailing block; the code
    // blocks themselves are untouched by highlighting.
    expect(editor.getJSON().content?.slice(0, 2)).toEqual(DOCUMENT.content);
  }, 15_000);
});
