import { describe, expect, it } from "vitest";

import { postOpenPath } from "@/features/post/schema";

describe("postOpenPath", () => {
  it("opens a published post in Preview", () => {
    expect(postOpenPath({ id: "p1", status: "PUBLISHED" })).toBe(
      "/admin/posts/p1/preview",
    );
  });

  it("opens a draft in Edit", () => {
    expect(postOpenPath({ id: "p1", status: "DRAFT" })).toBe("/admin/posts/p1");
  });
});
