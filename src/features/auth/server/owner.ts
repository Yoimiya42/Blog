interface SessionLike {
  user: { role?: unknown };
}

export function isOwnerSession(session: SessionLike | null | undefined) {
  return session?.user.role === "OWNER";
}

const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

/**
 * Better Auth derives the session cookie name from the base URL scheme, so
 * server components must resolve the same origin the auth route handler sees.
 */
export function originFromHeaders(headers: Headers) {
  const host = headers.get("host");
  if (!host) return undefined;

  const forwarded = headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const fallback = LOCAL_HOST.test(host) ? "http" : "https";
  const protocol =
    forwarded === "http" || forwarded === "https" ? forwarded : fallback;

  return `${protocol}://${host}`;
}
