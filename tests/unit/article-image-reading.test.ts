// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ArticleContent,
  type ArticleDocument,
  type ArticleMediaMap,
} from "@/features/post";
import { firstScreenImagePath } from "@/features/post/content/render/article-content";
import { ImageZoom } from "@/features/post/content/render/image-zoom";

const paragraph = { type: "paragraph", content: [{ type: "text", text: "x" }] };

function image(mediaId: string) {
  return { type: "image", attrs: { mediaId, alt: `alt ${mediaId}` } };
}

function doc(...content: unknown[]): ArticleDocument {
  return { type: "doc", content } as ArticleDocument;
}

const mediaById = {
  a: {
    url: "/media/a.jpg?w=1600",
    srcSet: "/media/a.jpg?w=480 480w, /media/a.jpg?w=960 900w",
    zoomUrl: "/media/a.jpg?w=960",
    width: 900,
    height: 600,
  },
  b: { url: "/media/b.jpg?w=1600", width: 400, height: 300 },
} satisfies ArticleMediaMap;

async function render(document: ArticleDocument): Promise<HTMLElement> {
  const host = window.document.createElement("div");
  host.innerHTML = renderToStaticMarkup(
    await ArticleContent({ document, mediaById }),
  );
  return host;
}

describe("first-screen image", () => {
  it("is the first image within the first three top-level blocks", () => {
    expect(firstScreenImagePath(doc(image("a")))).toBe("article.0");
    expect(firstScreenImagePath(doc(paragraph, paragraph, image("a")))).toBe(
      "article.2",
    );
    expect(
      firstScreenImagePath(doc(paragraph, paragraph, paragraph, image("a"))),
    ).toBeUndefined();
  });

  it("loads eagerly while every later image loads lazily", async () => {
    const host = await render(doc(paragraph, image("a"), image("b")));
    const [first, second] = host.querySelectorAll("figure img");

    expect(first.getAttribute("loading")).toBe("eager");
    expect(first.getAttribute("fetchpriority")).toBe("high");
    expect(second.getAttribute("loading")).toBe("lazy");
    expect(second.hasAttribute("fetchpriority")).toBe(false);
  });
});

describe("article image markup", () => {
  it("reserves layout space, offers variants, and keeps alt text", async () => {
    const host = await render(doc(paragraph, paragraph, paragraph, image("a")));
    const img = host.querySelector("figure img")!;

    expect(img.getAttribute("width")).toBe("900");
    expect(img.getAttribute("height")).toBe("600");
    expect(img.getAttribute("alt")).toBe("alt a");
    expect(img.getAttribute("srcset")).toBe(mediaById.a.srcSet);
    expect(img.getAttribute("sizes")).toBe("(min-width: 48rem) 44rem, 100vw");
    expect(img.getAttribute("loading")).toBe("lazy");
    // Without JavaScript the link opens the large variant.
    expect(host.querySelector("[data-image-zoom]")!.getAttribute("href")).toBe(
      "/media/a.jpg?w=960",
    );
  });

  it("omits sizes when only one source is known", async () => {
    const host = await render(doc(paragraph, paragraph, paragraph, image("b")));
    const img = host.querySelector("figure img")!;

    expect(img.hasAttribute("srcset")).toBe(false);
    expect(img.hasAttribute("sizes")).toBe(false);
    expect(host.querySelector("[data-image-zoom]")!.getAttribute("href")).toBe(
      "/media/b.jpg?w=1600",
    );
  });
});

describe("image enlargement", () => {
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    container = window.document.createElement("div");
    window.document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  async function mount() {
    await act(async () =>
      root.render(
        createElement(
          ImageZoom,
          {
            alt: "a grey cat",
            height: 600,
            src: "/media/a.jpg?w=960",
            srcSet: mediaById.a.srcSet,
            width: 900,
          },
          createElement("img", { alt: "a grey cat" }),
        ),
      ),
    );
    return {
      trigger: container.querySelector<HTMLAnchorElement>("[data-image-zoom]")!,
      dialog: container.querySelector<HTMLDialogElement>(
        "[data-image-zoom-dialog]",
      )!,
    };
  }

  async function click(element: Element, init: MouseEventInit = {}) {
    await act(async () => {
      element.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true, ...init }),
      );
    });
  }

  it("mounts the large copy only when opened", async () => {
    const { trigger, dialog } = await mount();

    expect(dialog.querySelector("img")).toBeNull();
    await click(trigger);

    expect(dialog.open).toBe(true);
    const large = dialog.querySelector("img")!;
    expect(large.getAttribute("src")).toBe("/media/a.jpg?w=960");
    expect(large.getAttribute("srcset")).toBe(mediaById.a.srcSet);
    expect(large.getAttribute("alt")).toBe("a grey cat");
  });

  it("closes from the visible control and returns focus to the image", async () => {
    const { trigger, dialog } = await mount();
    await click(trigger);
    const close = dialog.querySelector<HTMLButtonElement>(
      "[data-image-zoom-close]",
    )!;

    expect(close.textContent).toBe("Close");
    expect(close.getAttribute("aria-label")).toBe("Close enlarged image");
    await click(close);

    expect(dialog.open).toBe(false);
    expect(window.document.activeElement).toBe(trigger);
  });

  it("returns focus when the dialog closes another way, such as Escape", async () => {
    const { trigger, dialog } = await mount();
    await click(trigger);
    trigger.blur();

    // Escape closes a modal dialog natively and fires `close`.
    await act(async () => {
      dialog.close();
    });

    expect(window.document.activeElement).toBe(trigger);
  });

  it("leaves modified clicks to the browser", async () => {
    const { trigger, dialog } = await mount();
    await click(trigger, { ctrlKey: true });

    expect(dialog.open).toBe(false);
  });
});
