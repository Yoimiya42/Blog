/** FR-BLOG-21: dates within this span of `now` read as relative. */
export const RELATIVE_DATE_SPAN_MS = 7 * 24 * 60 * 60 * 1000;

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

// UTC, like `toCalendarDate`: every visitor sees the same calendar day.
const ABSOLUTE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function unit(count: number, name: string): string {
  return `${count} ${name}${count === 1 ? "" : "s"} ago`;
}

/**
 * `28 minutes ago`, `12 hours ago`, `3 days ago` within seven days of `now`;
 * `25 Nov 2026` after that. A date ahead of `now`, from clock skew, reads as
 * `just now`.
 */
export function formatPublishedDate(date: Date, now: Date): string {
  const elapsed = now.getTime() - date.getTime();
  if (elapsed >= RELATIVE_DATE_SPAN_MS) return ABSOLUTE.format(date);
  if (elapsed < MINUTE_MS) return "just now";
  if (elapsed < HOUR_MS) return unit(Math.floor(elapsed / MINUTE_MS), "minute");
  if (elapsed < DAY_MS) return unit(Math.floor(elapsed / HOUR_MS), "hour");

  return unit(Math.floor(elapsed / DAY_MS), "day");
}

/** The request time of a server render, in epoch milliseconds. */
export function requestTime(): number {
  return Date.now();
}
