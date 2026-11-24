/**
 * Blog list views (FR-BLOG-01). The choice lives in a cookie, so the server
 * renders the chosen view and the page never swaps views after load.
 */
export const BLOG_VIEWS = ["full", "compact"] as const;

export type BlogView = (typeof BLOG_VIEWS)[number];

export const BLOG_VIEW_COOKIE = "blog-view";

/** Anything but a known view, including no cookie, is the full view. */
export function parseBlogView(value: unknown): BlogView {
  return value === "compact" ? "compact" : "full";
}

/**
 * Where the switch returns to. Only a blog path on this site is accepted, so
 * the form cannot be used as an open redirect.
 */
export function safeBlogReturnPath(value: unknown): string {
  if (typeof value !== "string") return "/blog";

  // A backslash or whitespace could be normalised into another host.
  return /^\/blog(?:[/?]|$)/.test(value) && !/[\\\s]/.test(value)
    ? value
    : "/blog";
}
