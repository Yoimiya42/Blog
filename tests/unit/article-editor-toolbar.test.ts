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

// "Body." inside the paragraph that follows the seven-position heading.
const BODY = { from: 8, to: 13 };

let root: Root;
let container: HTMLDivElement;
let editor: Editor;

beforeEach(async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  await act(async () =>
    root.render(
      createElement(ArticleEditor, {
        initialDocument: STORED,
        name: "content",
        labelledBy: "label",
      }),
    ),
  );
  editor = (
    container.querySelector(".ProseMirror") as HTMLElement & { editor: Editor }
  ).editor;
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

function control<T extends HTMLElement = HTMLButtonElement>(label: string): T {
  const element = container.querySelector<T>(`[aria-label="${label}"]`);
  if (!element) throw new Error(`no control labelled ${label}`);

  return element;
}

/** The address field is named by a label element, not aria-label. */
function linkField() {
  return container.querySelector<HTMLInputElement>('input[type="text"]');
}

async function select(range: { from: number; to: number }) {
  await act(async () => {
    editor.commands.setTextSelection(range);
  });
}

async function press(label: string) {
  await act(async () => control(label).click());
}

/** React tracks the value it last set, so a plain assignment is ignored. */
async function type(element: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )!.set!;
  await act(async () => {
    setter.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function selection() {
  const { from, to } = editor.state.selection;

  return { from, to };
}

function submittedDocument(): ArticleDocument {
  const field = container.querySelector<HTMLInputElement>(
    'input[name="content"]',
  )!;
  const result = validateArticleDocument(JSON.parse(field.value));
  if (!result.ok) throw new Error(JSON.stringify(result.issues));

  return result.document;
}

describe("editor toolbar", () => {
  it("exposes the controls as non-submitting buttons in a toolbar", () => {
    const toolbar = container.querySelector('[role="toolbar"]')!;
    const labels = [...toolbar.querySelectorAll("button")].map((button) => {
      expect(button.type).toBe("button");

      return button.getAttribute("aria-label");
    });

    expect(labels).toEqual([
      "Heading 2",
      "Heading 3",
      "Heading 4",
      "Bold",
      "Link",
      "Bulleted list",
      "Numbered list",
      "Code block",
    ]);
  });

  it("keeps focus in the editor when a control is pressed", () => {
    const event = new MouseEvent("mousedown", {
      bubbles: true,
      cancelable: true,
    });
    control("Bold").dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it("applies bold to the selection and keeps the selection", async () => {
    await select(BODY);
    await press("Bold");

    expect(selection()).toEqual(BODY);
    expect(control("Bold").getAttribute("aria-pressed")).toBe("true");
    expect(submittedDocument().content[1]).toEqual({
      type: "paragraph",
      content: [{ type: "text", text: "Body.", marks: [{ type: "bold" }] }],
    });
  });

  it("turns a paragraph into a heading with an id and keeps the cursor", async () => {
    await select({ from: 10, to: 10 });
    await press("Heading 3");

    expect(selection()).toEqual({ from: 10, to: 10 });
    expect(control("Heading 3").getAttribute("aria-pressed")).toBe("true");
    expect(submittedDocument().content[1]).toMatchObject({
      type: "heading",
      attrs: { level: 3, id: expect.stringMatching(/^[0-9a-f]{12}$/) },
    });
  });

  it("wraps the block in a bulleted and a numbered list", async () => {
    await select({ from: 10, to: 10 });
    await press("Bulleted list");
    expect(submittedDocument().content[1]).toMatchObject({
      type: "bulletList",
    });

    await press("Numbered list");
    expect(submittedDocument().content[1]).toMatchObject({
      type: "orderedList",
    });
    expect(control("Numbered list").getAttribute("aria-pressed")).toBe("true");
  });

  it("creates a code block and sets its language", async () => {
    await select({ from: 10, to: 10 });
    expect(container.querySelector('[aria-label="Code language"]')).toBeNull();

    await press("Code block");
    expect(submittedDocument().content[1]).toMatchObject({
      type: "codeBlock",
      attrs: { language: "plaintext" },
    });
    // Marks are not allowed inside a code block.
    expect(control("Bold").disabled).toBe(true);

    const language = container.querySelector("select")!;
    await act(async () => {
      language.value = "python";
      language.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(submittedDocument().content[1]).toMatchObject({
      type: "codeBlock",
      attrs: { language: "python" },
    });
  });

  it("disables the link control without a selection", async () => {
    await select({ from: 10, to: 10 });

    expect(control("Link").disabled).toBe(true);
  });

  it("links the selection and restores it after the address is applied", async () => {
    await select(BODY);
    await press("Link");
    await type(linkField()!, "https://example.com/a");
    await press("Apply link");

    expect(selection()).toEqual(BODY);
    expect(linkField()).toBeNull();
    expect(submittedDocument().content[1]).toEqual({
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Body.",
          marks: [{ type: "link", attrs: { href: "https://example.com/a" } }],
        },
      ],
    });
  });

  it("rejects an unsafe link address and leaves the document unchanged", async () => {
    await select(BODY);
    await press("Link");
    await type(linkField()!, "javascript:alert(1)");
    await press("Apply link");

    expect(container.querySelector('[role="alert"]')?.textContent).toMatch(
      /relative, https, http, or mailto/,
    );
    expect(submittedDocument()).toEqual(STORED);
  });

  it("removes an existing link from the whole linked range", async () => {
    await select(BODY);
    await press("Link");
    await type(linkField()!, "/about");
    await press("Apply link");

    // A cursor inside the link is enough to reach the whole range.
    await select({ from: 10, to: 10 });
    await press("Link");
    expect(linkField()!.value).toBe("/about");
    await press("Remove link");

    expect(submittedDocument()).toEqual(STORED);
  });
});
