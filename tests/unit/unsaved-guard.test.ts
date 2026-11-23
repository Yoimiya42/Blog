// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { UnsavedChangesGuard } from "@/features/post/components/unsaved-guard";

let root: Root;
let container: HTMLDivElement;
let link: HTMLAnchorElement;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  push.mockReset();
  container = document.createElement("div");
  document.body.appendChild(container);
  link = document.createElement("a");
  link.href = "/admin/posts/post-1/preview";
  link.textContent = "Preview";
  document.body.appendChild(link);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  link.remove();
  vi.unstubAllGlobals();
});

async function mount(props: Parameters<typeof UnsavedChangesGuard>[0]) {
  await act(async () => root.render(createElement(UnsavedChangesGuard, props)));
}

/** Clicks the link; returns whether the guard let the browser follow it. */
async function clickLink(): Promise<boolean> {
  let followed = false;
  // The guard stops an intercepted click, so it never reaches the window. A
  // click that does is stopped here: happy-dom would navigate, and the next
  // test's link would then point at the current page.
  function record(event: Event) {
    followed = !event.defaultPrevented;
    event.preventDefault();
  }
  window.addEventListener("click", record);
  await act(async () => {
    link.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true }),
    );
  });
  window.removeEventListener("click", record);
  // Let the save promise settle.
  await act(async () => {});
  return followed;
}

function dialogText(): string {
  return document.querySelector('[role="dialog"]')?.textContent ?? "";
}

describe("UnsavedChangesGuard", () => {
  it("lets a clean page leave untouched", async () => {
    const save = vi.fn();
    await mount({ isDirty: () => false, save, saveOnLeave: true });

    expect(await clickLink()).toBe(true);
    expect(save).not.toHaveBeenCalled();
  });

  it("saves a draft, then follows the link", async () => {
    const save = vi.fn().mockResolvedValue(true);
    await mount({ isDirty: () => true, save, saveOnLeave: true });

    expect(await clickLink()).toBe(false);
    expect(save).toHaveBeenCalledOnce();
    expect(push).toHaveBeenCalledWith("/admin/posts/post-1/preview");
    expect(dialogText()).toBe("");
  });

  it("stays when the save fails", async () => {
    const save = vi.fn().mockResolvedValue(false);
    await mount({ isDirty: () => true, save, saveOnLeave: true });

    await clickLink();

    expect(save).toHaveBeenCalledOnce();
    expect(push).not.toHaveBeenCalled();
  });

  it("asks before saving a published post", async () => {
    const save = vi.fn().mockResolvedValue(true);
    await mount({ isDirty: () => true, save, saveOnLeave: false });

    await clickLink();

    expect(save).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    expect(dialogText()).toContain("Save and leave");
    expect(dialogText()).toContain("Discard");
  });

  it("asks to discard when the form cannot save", async () => {
    await mount({ isDirty: () => true });

    await clickLink();

    expect(push).not.toHaveBeenCalled();
    expect(dialogText()).toContain("Leave without saving?");
  });
});
