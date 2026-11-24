/**
 * Blog list views (FR-BLOG-01). The choice lives in a cookie, so the server
 * renders the chosen view and the page never swaps views after load.
 */
export const BLOG_VIEWS = ["full", "compact"] as const;

export type BlogView = (typeof BLOG_VIEWS)[number];

export const BLOG_VIEW_COOKIE = "blog-view";

/** Shared by the server action and the in-page switch, so both write alike. */
export const BLOG_VIEW_COOKIE_OPTIONS = {
  path: "/blog",
  maxAge: 60 * 60 * 24 * 365,
  sameSite: "lax",
} as const;

/** `document.cookie` form of the preference. */
export function serializeBlogViewCookie(view: BlogView): string {
  const { path, maxAge, sameSite } = BLOG_VIEW_COOKIE_OPTIONS;

  return `${BLOG_VIEW_COOKIE}=${view}; Path=${path}; Max-Age=${maxAge}; SameSite=${sameSite}`;
}

/** The stored view, or null when there is no cookie. */
export function readBlogViewCookie(cookieHeader: string): BlogView | null {
  for (const pair of cookieHeader.split(";")) {
    const [name, value] = pair.trim().split("=");
    if (name === BLOG_VIEW_COOKIE) return parseBlogView(value);
  }

  return null;
}

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
