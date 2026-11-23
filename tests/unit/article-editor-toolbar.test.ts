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

/** The link pair renders in a portal on document.body. */
function pairField(label: "Link text" | "Link address") {
  return document.body.querySelector<HTMLInputElement>(
    `[aria-label="${label}"]`,
  );
}

async function pressInPair(label: string) {
  const button = document.body.querySelector<HTMLButtonElement>(
    `[aria-label="${label}"]`,
  );
  if (!button) throw new Error(`no pair control labelled ${label}`);
  await act(async () => button.click());
}

function bodyParagraph() {
  return submittedDocument().content[1];
}

/** Inline content of the body paragraph. */
function bodyInline() {
  const paragraph = bodyParagraph();
  if (paragraph?.type !== "paragraph") throw new Error("no body paragraph");

  return paragraph.content ?? [];
}

async function select(range: { from: number; to: number }) {
  await act(async () => {
    editor.commands.setTextSelection(range);
  });
}

/** Popover menus render in a portal on document.body. */
function menuItem(label: string): HTMLButtonElement {
  const item = [
    ...document.body.querySelectorAll<HTMLButtonElement>(
      '[role="menuitemradio"]',
    ),
  ].find((element) => element.textContent === label);
  if (!item) throw new Error(`no menu item ${label}`);

  return item;
}

/** Radix menus open on a primary pointer press, not on a synthetic click. */
async function openMenu(label: string) {
  await act(async () => {
    control(label).dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        button: 0,
        pointerType: "mouse",
      }),
    );
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
      "Quote",
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

  it("creates a code block in the picked language and changes it from the header", async () => {
    await select({ from: 10, to: 10 });

    // The language is picked before the block exists.
    await openMenu("Code block");
    expect(submittedDocument().content[1]).toMatchObject({
      type: "paragraph",
    });
    await act(async () => menuItem("TypeScript").click());

    expect(submittedDocument().content[1]).toMatchObject({
      type: "codeBlock",
      attrs: { language: "typescript" },
    });
    // Marks are not allowed inside a code block.
    expect(control("Bold").disabled).toBe(true);

    await openMenu("Code language: TypeScript");
    await act(async () => menuItem("Python").click());

    expect(submittedDocument().content[1]).toMatchObject({
      type: "codeBlock",
      attrs: { language: "python" },
    });
  });

  it("enables the link control without a selection", async () => {
    await select({ from: 13, to: 13 });

    expect(control("Link").disabled).toBe(false);
  });

  it("inserts a named link at the cursor and adds https to a bare domain", async () => {
    await select({ from: 13, to: 13 });
    await press("Link");
    await type(pairField("Link text")!, "Google");
    await type(pairField("Link address")!, "www.google.com");
    await pressInPair("Apply link");

    expect(pairField("Link text")).toBeNull();
    expect(bodyParagraph()).toEqual({
      type: "paragraph",
      content: [
        { type: "text", text: "Body." },
        {
          type: "text",
          text: "Google",
          marks: [{ type: "link", attrs: { href: "https://www.google.com" } }],
        },
      ],
    });
    // Typing on after the link stays plain text.
    await act(async () => {
      editor.commands.insertContent("!");
    });
    expect(bodyInline().at(-1)).toEqual({
      type: "text",
      text: "!",
    });
  });

  it("uses the address as the text when the text is empty", async () => {
    await select({ from: 13, to: 13 });
    await press("Link");
    await type(pairField("Link address")!, "https://example.com");
    await pressInPair("Apply link");

    expect(bodyInline().at(-1)).toEqual({
      type: "text",
      text: "https://example.com",
      marks: [{ type: "link", attrs: { href: "https://example.com" } }],
    });
  });

  it("links the selection under its own text", async () => {
    await select(BODY);
    await press("Link");
    expect(pairField("Link text")!.value).toBe("Body.");
    await type(pairField("Link address")!, "https://example.com/a");
    await pressInPair("Apply link");

    expect(selection()).toEqual({ from: BODY.to, to: BODY.to });
    expect(bodyParagraph()).toEqual({
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

  it("renames an existing link from a cursor inside it", async () => {
    await select(BODY);
    await press("Link");
    await type(pairField("Link address")!, "/about");
    await pressInPair("Apply link");

    await select({ from: 10, to: 10 });
    await press("Link");
    expect(pairField("Link address")!.value).toBe("/about");
    await type(pairField("Link text")!, "About");
    await pressInPair("Apply link");

    expect(bodyParagraph()).toEqual({
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "About",
          marks: [{ type: "link", attrs: { href: "/about" } }],
        },
      ],
    });
  });

  it("rejects an unsafe link address and leaves the document unchanged", async () => {
    await select(BODY);
    await press("Link");
    await type(pairField("Link address")!, "javascript:alert(1)");
    await pressInPair("Apply link");

    expect(document.body.querySelector('[role="alert"]')?.textContent).toMatch(
      /relative, https, http, or mailto/,
    );
    expect(submittedDocument()).toEqual(STORED);
  });

  it("removes an existing link from the whole linked range", async () => {
    await select(BODY);
    await press("Link");
    await type(pairField("Link address")!, "/about");
    await pressInPair("Apply link");

    // A cursor inside the link is enough to reach the whole range.
    await select({ from: 10, to: 10 });
    await press("Link");
    await pressInPair("Remove link");

    expect(submittedDocument()).toEqual(STORED);
  });

  it("opens the pair with Ctrl or Cmd+K", async () => {
    await select({ from: 13, to: 13 });
    // A real key event: TipTap's keyboardShortcut command keeps only the
    // steps of what the handler dispatches, and the prompt is meta.
    const mac = /Mac/.test(navigator.platform);
    await act(async () => {
      editor.view.dom.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "k",
          ctrlKey: !mac,
          metaKey: mac,
          bubbles: true,
          cancelable: true,
        }),
      );
    });

    expect(pairField("Link text")).not.toBeNull();
  });

  it("links a pasted address and opens the pair with the text empty", async () => {
    await select({ from: 13, to: 13 });
    await act(async () => {
      editor.view.pasteText("https://example.com/x");
    });

    expect(bodyInline().at(-1)).toEqual({
      type: "text",
      text: "https://example.com/x",
      marks: [{ type: "link", attrs: { href: "https://example.com/x" } }],
    });
    expect(pairField("Link text")!.value).toBe("");
    expect(pairField("Link address")!.value).toBe("https://example.com/x");

    await type(pairField("Link text")!, "Example");
    await pressInPair("Apply link");
    expect(bodyInline().at(-1)).toEqual({
      type: "text",
      text: "Example",
      marks: [{ type: "link", attrs: { href: "https://example.com/x" } }],
    });
  });

  it("leaves pasted prose alone", async () => {
    await select({ from: 13, to: 13 });
    await act(async () => {
      editor.view.pasteText("see example.com");
    });

    expect(pairField("Link text")).toBeNull();
  });

  it("converts typed Markdown link syntax", async () => {
    await select({ from: 13, to: 13 });
    await act(async () => {
      editor.commands.insertContent("[Google](www.google.com");
    });
    const at = editor.state.selection.from;
    await act(async () => {
      editor.view.someProp("handleTextInput", (handler) =>
        handler(editor.view, at, at, ")", () => editor.state.tr),
      );
    });

    expect(bodyInline().at(-1)).toEqual({
      type: "text",
      text: "Google",
      marks: [{ type: "link", attrs: { href: "https://www.google.com" } }],
    });
  });

  it("leaves Markdown syntax that arrives in one input to plain insertion", async () => {
    await select({ from: 13, to: 13 });
    let handled: boolean | void | undefined;
    await act(async () => {
      handled = editor.view.someProp("handleTextInput", (handler) =>
        handler(editor.view, 13, 13, " [Docs](a.com)", () => editor.state.tr),
      );
    });

    // Not handled: ProseMirror inserts the text itself instead of dropping it.
    expect(handled).toBeFalsy();
    expect(submittedDocument()).toEqual(STORED);
  });

  it("wraps the paragraph in a quote and unwraps it again", async () => {
    await select({ from: 10, to: 10 });
    await press("Quote");

    expect(control("Quote").getAttribute("aria-pressed")).toBe("true");
    expect(submittedDocument().content[1]).toEqual({
      type: "blockquote",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Body." }] },
      ],
    });

    await press("Quote");
    expect(submittedDocument()).toEqual(STORED);
  });

  it("refuses to quote a heading, which schema v1 keeps out of quotes", async () => {
    await select({ from: 3, to: 3 });

    expect(control("Quote").disabled).toBe(true);
  });
});
