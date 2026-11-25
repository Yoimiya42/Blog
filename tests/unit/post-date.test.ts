import { describe, expect, it } from "vitest";

import { formatPublishedDate } from "@/features/post/components/public/post-date";

const NOW = new Date("2026-11-25T12:00:00.000Z");

function ago(milliseconds: number): Date {
  return new Date(NOW.getTime() - milliseconds);
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe("formatPublishedDate (FR-BLOG-21)", () => {
  it.each([
    [ago(30_000), "just now"],
    [ago(MINUTE), "1 minute ago"],
    [ago(28 * MINUTE), "28 minutes ago"],
    [ago(HOUR), "1 hour ago"],
    [ago(12 * HOUR + 59 * MINUTE), "12 hours ago"],
    [ago(DAY), "1 day ago"],
    [ago(7 * DAY - 1), "6 days ago"],
    [ago(7 * DAY), "18 Nov 2026"],
    [new Date("2025-03-04T00:00:00.000Z"), "4 Mar 2025"],
    [new Date(NOW.getTime() + 5 * MINUTE), "just now"],
  ])("formats %s as %s", (date, expected) => {
    expect(formatPublishedDate(date, NOW)).toBe(expected);
  });
});
