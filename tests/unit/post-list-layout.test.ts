import { describe, expect, it } from "vitest";

import { parseBlogView, safeBlogReturnPath } from "@/features/post/blog-view";
import {
  groupByYear,
  planFullLayout,
} from "@/features/post/components/public/full-layout";

const covered = (slug: string) => ({ slug, cover: {} });
const bare = (slug: string) => ({ slug, cover: null });

/** Compact form of a plan: kind and slugs, with the row cover side. */
function shape(posts: { slug: string; cover: unknown }[]) {
  return planFullLayout(posts).map((block) => {
    switch (block.kind) {
      case "pair":
        return `pair:${block.posts.map((post) => post.slug).join("+")}`;
      case "row":
        return `row:${block.post.slug}:${block.coverSide}`;
      default:
        return `${block.kind}:${block.post.slug}`;
    }
  });
}

describe("full view rotation (FR-BLOG-15)", () => {
  it("leads, then cycles pair, row, row with alternating rows", () => {
    const posts = ["a", "b", "c", "d", "e", "f", "g", "h"].map(covered);

    expect(shape(posts)).toEqual([
      "lead:a",
      "pair:b+c",
      "row:d:end",
      "row:e:start",
      "pair:f+g",
      "row:h:end",
    ]);
  });

  it("renders a coverless post as a quote without advancing the cycle", () => {
    expect(
      shape([bare("a"), covered("b"), covered("c"), bare("d"), covered("e")]),
    ).toEqual(["quote:a", "pair:b+c", "quote:d", "row:e:end"]);
  });

  it("renders a pair left with one post as a row", () => {
    expect(shape([covered("a"), covered("b"), bare("c")])).toEqual([
      "lead:a",
      "row:b:end",
      "quote:c",
    ]);
    expect(shape([covered("a"), covered("b")])).toEqual([
      "lead:a",
      "row:b:end",
    ]);
  });

  it("plans nothing for an empty page", () => {
    expect(planFullLayout([])).toEqual([]);
  });
});

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
