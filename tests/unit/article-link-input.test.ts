import { describe, expect, it } from "vitest";

import {
  MARKDOWN_LINK,
  normalizeLinkHref,
  pastedWebAddress,
} from "@/features/post/content/editor/link";

describe("normalizeLinkHref", () => {
  it.each([
    ["www.google.com", "https://www.google.com"],
    ["google.com/search?q=a", "https://google.com/search?q=a"],
    ["  example.org  ", "https://example.org"],
    ["localhost.dev:8080/x", "https://localhost.dev:8080/x"],
  ])("adds https to the bare domain %s", (raw, expected) => {
    expect(normalizeLinkHref(raw)).toBe(expected);
  });

  it.each([
    ["https://a.com", "https://a.com"],
    ["mailto:me@a.com", "mailto:me@a.com"],
    ["/about", "/about"],
    ["#intro", "#intro"],
    ["javascript:alert(1)", "javascript:alert(1)"],
    ["notes", "notes"],
    ["me@a.com", "me@a.com"],
    ["", ""],
  ])("leaves %s for the validator", (raw, expected) => {
    expect(normalizeLinkHref(raw)).toBe(expected);
  });
});

describe("pastedWebAddress", () => {
  it.each([
    ["https://example.com/x", "https://example.com/x"],
    ["www.google.com\n", "https://www.google.com"],
  ])("accepts %s", (text, expected) => {
    expect(pastedWebAddress(text)).toBe(expected);
  });

  it.each([
    "see example.com",
    "/about",
    "mailto:me@a.com",
    "javascript:alert(1)",
    "plain",
    "",
  ])("ignores %s", (text) => {
    expect(pastedWebAddress(text)).toBeNull();
  });
});

describe("MARKDOWN_LINK", () => {
  it("captures text and address at the end of the input", () => {
    expect(
      "see [Google](https://google.com)".match(MARKDOWN_LINK)?.slice(1),
    ).toEqual(["Google", "https://google.com"]);
  });

  it("needs both parts and no space in the address", () => {
    expect("[](https://a.com)").not.toMatch(MARKDOWN_LINK);
    expect("[a](b c)").not.toMatch(MARKDOWN_LINK);
  });
});
