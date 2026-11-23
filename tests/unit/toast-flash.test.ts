// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { showFlash } from "@/components/ui/toast";

beforeEach(() => {
  // The flash cookie is scoped to /admin.
  window.history.replaceState(null, "", "/admin/posts/post-1");
});

afterEach(() => {
  document.cookie = "admin-flash=; Max-Age=0; path=/admin";
});

describe("showFlash", () => {
  it("shows a flash once and clears the cookie", () => {
    document.cookie = "admin-flash=Published; path=/admin";

    expect(showFlash()).toBe(true);
    expect(document.cookie).not.toContain("admin-flash=Published");
    // A second check, such as the toaster's path check, finds nothing.
    expect(showFlash()).toBe(false);
  });

  it("does nothing without a flash", () => {
    expect(showFlash()).toBe(false);
  });
});
