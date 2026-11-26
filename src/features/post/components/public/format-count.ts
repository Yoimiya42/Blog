const COUNT_FORMAT = new Intl.NumberFormat("en-GB", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** `842`, `1.2K`, `3.4M`: view and like counts on cards and the post page. */
export function formatCount(count: number): string {
  return COUNT_FORMAT.format(count);
}

/** Screen-reader form: `1 view`, `12 likes`. */
export function countLabel(count: number, noun: "view" | "like"): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}
