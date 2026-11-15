import { describe, expect, it } from "vitest";

import { TAG_LIMIT_HINT } from "@/features/post/components/post-form";
import {
  parseTagNames,
  TAG_NAME_MAX_LENGTH,
  TAGS_PER_POST_MAX,
  toTagSlug,
} from "@/features/tag";

describe("tag slugs", () => {
  it.each([
    ["Go", "go"],
    ["Cloudflare Workers", "cloudflare-workers"],
    ["C++", "c"],
    ["node_js", "node-js"],
    ["  spaced  out  ", "spaced-out"],
    ["数据库", "数据库"],
    ["ＴｙｐｅＳｃｒｉｐｔ", "typescript"],
    ["!!!", ""],
  ])("maps %s to %s", (name, slug) => {
    expect(toTagSlug(name)).toBe(slug);
  });
});

describe("tag field parsing", () => {
  it("splits on ASCII, full-width, and ideographic commas", () => {
    expect(parseTagNames("Go, 数据库，Rust、 SQL ")).toEqual({
      ok: true,
      names: ["Go", "数据库", "Rust", "SQL"],
    });
  });

  it("drops blanks and repeats that share a slug", () => {
    expect(parseTagNames(" , Go, go ,GO,")).toEqual({
      ok: true,
      names: ["Go"],
    });
  });

  it("accepts an empty field as no tags", () => {
    expect(parseTagNames("")).toEqual({ ok: true, names: [] });
  });

  it("rejects a name without letters or digits", () => {
    expect(parseTagNames("Go, ???")).toMatchObject({ ok: false });
  });

  it("rejects an over-long name", () => {
    expect(parseTagNames("x".repeat(TAG_NAME_MAX_LENGTH + 1))).toMatchObject({
      ok: false,
    });
  });

  it("caps the tag count", () => {
    const names = (count: number) =>
      Array.from({ length: count }, (_, i) => `t${i}`).join(",");

    expect(parseTagNames(names(TAGS_PER_POST_MAX)).ok).toBe(true);
    expect(parseTagNames(names(TAGS_PER_POST_MAX + 1)).ok).toBe(false);
  });

  it("keeps the form hint in step with the limit", () => {
    expect(TAG_LIMIT_HINT).toBe(TAGS_PER_POST_MAX);
  });
});
