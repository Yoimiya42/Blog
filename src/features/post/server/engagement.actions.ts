"use server";

import { cookies, headers } from "next/headers";

import {
  LIKE_RATE_LIMIT,
  parseVisitorId,
  VISITOR_COOKIE,
  VISITOR_COOKIE_OPTIONS,
} from "../visitor";
import { getPublicPostService } from "./public-post.service";
import { getRateLimiter, hashClientAddress } from "./rate-limit.repository";

/**
 * FR-BLOG-19: called once by the post page after load, so prefetches and
 * crawlers that run no script do not count. No visitor data is read or kept.
 */
export async function recordPostViewAction(slug: unknown): Promise<void> {
  if (typeof slug !== "string" || slug === "") return;

  await (await getPublicPostService()).recordView(slug);
}

export type LikeResponse =
  | { ok: true; liked: boolean; likes: number }
  | { ok: false; reason: "not_found" | "rate_limited" };

/**
 * FR-BLOG-20: toggles the visitor's like. The visitor cookie is created here,
 * on the first like, and nowhere else (ADR-0037).
 */
export async function togglePostLikeAction(
  slug: unknown,
): Promise<LikeResponse> {
  if (typeof slug !== "string" || slug === "") {
    return { ok: false, reason: "not_found" };
  }

  // Local development has no Cloudflare edge header; it shares one bucket.
  const address = (await headers()).get("cf-connecting-ip") ?? "local";
  const limiter = await getRateLimiter();
  if (
    !(await limiter.allow(LIKE_RATE_LIMIT, await hashClientAddress(address)))
  ) {
    return { ok: false, reason: "rate_limited" };
  }

  const jar = await cookies();
  let visitorId = parseVisitorId(jar.get(VISITOR_COOKIE)?.value);
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    jar.set(VISITOR_COOKIE, visitorId, VISITOR_COOKIE_OPTIONS);
  }

  const result = await (
    await getPublicPostService()
  ).toggleLike(slug, visitorId);

  return result ? { ok: true, ...result } : { ok: false, reason: "not_found" };
}
