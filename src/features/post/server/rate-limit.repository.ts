import { getDatabase } from "@/lib/db/client";

export interface RateLimitRule {
  /** Namespaces the key; Better Auth's own keys never use it. */
  scope: string;
  max: number;
  windowMs: number;
}

/**
 * Hex SHA-256 of the client IP, so the shared `rate_limit` table holds no raw
 * address for visitor features (ADR-0037).
 */
export async function hashClientAddress(address: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(address),
  );

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

/**
 * Fixed-window limit in the `rate_limit` table that Better Auth also uses.
 * One upsert counts the request, so concurrent requests cannot both pass on a
 * stale count. Here `last_request` holds the window start.
 */
export function createRateLimiter(db: D1Database) {
  return {
    async allow(
      rule: RateLimitRule,
      subject: string,
      now: Date = new Date(),
    ): Promise<boolean> {
      const time = now.getTime();
      const row = await db
        .prepare(
          `INSERT INTO rate_limit (id, key, count, last_request)
           VALUES (?1, ?2, 1, ?3)
           ON CONFLICT (key) DO UPDATE SET
             count = CASE WHEN ?3 - last_request >= ?4 THEN 1
                          ELSE count + 1 END,
             last_request = CASE WHEN ?3 - last_request >= ?4 THEN ?3
                                 ELSE last_request END
           RETURNING count`,
        )
        .bind(
          crypto.randomUUID(),
          `${rule.scope}:${subject}`,
          time,
          rule.windowMs,
        )
        .first<{ count: number }>();

      return (row?.count ?? 1) <= rule.max;
    },
  };
}

export type RateLimiter = ReturnType<typeof createRateLimiter>;

export async function getRateLimiter(): Promise<RateLimiter> {
  return createRateLimiter(await getDatabase());
}
