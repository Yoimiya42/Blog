// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CopyCodeButton } from "@/features/post/content/render/copy-code-button";
import { CodeBlock } from "@/features/post/content/render/code-block";

let root: Root;
let container: HTMLDivElement;
const writeText = vi.fn<(text: string) => Promise<void>>();
const rawCode = "<main>safe</main>\n  next\n";
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("navigator", { clipboard: { writeText } });
  writeText.mockReset().mockResolvedValue(undefined);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
async function mount() {
  await act(async () =>
    root.render(createElement(CopyCodeButton, { code: rawCode })),
  );
  return container.querySelector("button")!;
}
async function advance(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
}

describe("copy code interaction", () => {
  it("copies raw text and announces success until the feedback expires", async () => {
    const button = await mount();
    expect(button.textContent).toBe("Copy code");
    expect(button.getAttribute("aria-live")).toBe("polite");
    expect(button.type).toBe("button");
    await act(async () => button.click());
    expect(writeText).toHaveBeenCalledWith(rawCode);
    expect(button.textContent).toBe("Copied");
    await advance(1999);
    expect(button.textContent).toBe("Copied");
    await advance(1);
    expect(button.textContent).toBe("Copy code");
  });

  it("restores the default after a Clipboard API rejection and permits retry", async () => {
    const button = await mount();
    await act(async () => button.click());
    writeText.mockRejectedValueOnce(new Error("denied"));
    await act(async () => button.click());
    expect(button.textContent).toBe("Copy code");
    await act(async () => button.click());
    expect(button.textContent).toBe("Copied");
    await advance(2000);
    expect(button.textContent).toBe("Copy code");
  });

  it("recovers from rapid overlapping copy attempts", async () => {
    let resolveFirst!: () => void;
    let rejectSecond!: (error: Error) => void;
    writeText
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<void>((_resolve, reject) => {
            rejectSecond = reject;
          }),
      );
    const button = await mount();
    await act(async () => {
      button.click();
      button.click();
    });
    await act(async () => {
      rejectSecond(new Error("denied"));
    });
    await act(async () => {
      resolveFirst();
    });
    await advance(2000);
    expect(button.textContent).toBe("Copy code");
    expect(writeText).toHaveBeenCalledTimes(2);
    await act(async () => {
      button.click();
      button.click();
    });
    expect(button.textContent).toBe("Copied");
    await advance(2000);
    expect(button.textContent).toBe("Copy code");
  });

  it("passes the original multiline code from highlighted output to the clipboard", async () => {
    const block = await CodeBlock({
      node: {
        type: "codeBlock",
        attrs: { language: "plaintext" },
        content: [{ type: "text", text: rawCode }],
      },
    });
    await act(async () => root.render(block));
    expect(container.querySelector("pre code")?.textContent).toBe(rawCode);
    expect(container.querySelectorAll("[data-code-line]")).toHaveLength(3);
    expect(container.querySelector("main")).toBeNull();
    await act(async () => container.querySelector("button")!.click());
    expect(writeText).toHaveBeenCalledWith(rawCode);
  });
});
