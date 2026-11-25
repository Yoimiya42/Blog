/**
 * Anonymous like identity (FR-BLOG-20, ADR-0037). A random id set only when a
 * visitor first likes a post; it holds nothing else.
 */
export const VISITOR_COOKIE = "visitor_id";

export const VISITOR_COOKIE_OPTIONS = {
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
  sameSite: "lax",
  httpOnly: true,
  secure: true,
} as const;

const VISITOR_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Only an id this site could have issued is used; anything else is ignored. */
export function parseVisitorId(value: unknown): string | undefined {
  return typeof value === "string" && VISITOR_ID_PATTERN.test(value)
    ? value
    : undefined;
}

/** FR-BLOG-20 abuse limit, per hashed IP. */
export const LIKE_RATE_LIMIT = {
  scope: "post-like",
  max: 30,
  windowMs: 60_000,
} as const;
