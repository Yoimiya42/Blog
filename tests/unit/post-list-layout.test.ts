import { describe, expect, it } from "vitest";

import {
  parseBlogView,
  readBlogViewCookie,
  safeBlogReturnPath,
  serializeBlogViewCookie,
} from "@/features/post/blog-view";
import { groupByYear } from "@/features/post/components/public/group-by-year";

describe("compact view grouping (FR-BLOG-16)", () => {
  it("groups by UTC publication year, keeping order", () => {
    const at = (iso: string) => ({ publishedAt: new Date(iso), id: iso });
    const groups = groupByYear([
      at("2026-11-20T00:00:00Z"),
      at("2026-01-01T00:30:00Z"),
      // 23:30 UTC on 31 December stays in 2025 for every visitor.
      at("2025-12-31T23:30:00Z"),
    ]);

    expect(groups.map((group) => [group.year, group.posts.length])).toEqual([
      [2026, 2],
      [2025, 1],
    ]);
  });
});

describe("blog view preference", () => {
  it("round-trips the in-page cookie write", () => {
    const written = serializeBlogViewCookie("compact");
    expect(written).toBe(
      "blog-view=compact; Path=/blog; Max-Age=31536000; SameSite=lax",
    );
    expect(readBlogViewCookie("a=1; blog-view=compact; b=2")).toBe("compact");
    expect(readBlogViewCookie("blog-view=other")).toBe("full");
    expect(readBlogViewCookie("a=1")).toBeNull();
  });

  it("defaults to the full view", () => {
    expect(parseBlogView("compact")).toBe("compact");
    expect(parseBlogView("full")).toBe("full");
    expect(parseBlogView(undefined)).toBe("full");
    expect(parseBlogView("grid")).toBe("full");
  });

  it("returns only to blog paths on this site", () => {
    expect(safeBlogReturnPath("/blog?page=2")).toBe("/blog?page=2");
    expect(safeBlogReturnPath("/blog/tags/sqlite")).toBe("/blog/tags/sqlite");
    expect(safeBlogReturnPath("/blogger")).toBe("/blog");
    expect(safeBlogReturnPath("https://example.com/blog")).toBe("/blog");
    expect(safeBlogReturnPath("//example.com")).toBe("/blog");
    expect(safeBlogReturnPath("/blog\\@example.com")).toBe("/blog");
    expect(safeBlogReturnPath(null)).toBe("/blog");
  });
});
