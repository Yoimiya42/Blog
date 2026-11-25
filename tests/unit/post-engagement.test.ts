import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { NewPost } from "@/features/post";
import { createPostRepository } from "@/features/post/server/post.repository";
import {
  createPublicPostService,
  type PublicPostService,
} from "@/features/post/server/public-post.service";
import { createRateLimiter } from "@/features/post/server/rate-limit.repository";
import { createCategoryRepository } from "@/features/category";
import { createTagRepository } from "@/features/tag";

import {
  clearContentTables,
  createMigratedDatabase,
  SAMPLE_DOCUMENT,
  type TestDatabase,
} from "../helpers/d1";

const NOW = new Date("2026-11-25T00:00:00.000Z");
const VISITOR_A = "11111111-1111-4111-8111-111111111111";
const VISITOR_B = "22222222-2222-4222-8222-222222222222";

let database: TestDatabase;
let db: D1Database;
let posts: ReturnType<typeof createPostRepository>;
let service: PublicPostService;

function post(overrides: Partial<NewPost> & { id: string }): NewPost {
  return {
    slug: overrides.id,
    title: `Title ${overrides.id}`,
    summary: null,
    content: SAMPLE_DOCUMENT,
    contentSchemaVersion: 1,
    status: "PUBLISHED",
    publishedAt: NOW,
    ...overrides,
  };
}

beforeAll(async () => {
  database = await createMigratedDatabase();
  db = database.db;
  posts = createPostRepository(db);
  service = createPublicPostService({
    posts,
    tags: createTagRepository(db),
    categories: createCategoryRepository(db),
    now: () => NOW,
  });
}, 30_000);

afterAll(async () => {
  await database.dispose();
});

beforeEach(async () => {
  await clearContentTables(db);
  await db.prepare("DELETE FROM rate_limit").run();
});

describe("views (FR-BLOG-19)", () => {
  it("counts every opening of a published post", async () => {
    await posts.insert(post({ id: "a" }), NOW);

    expect(await service.recordView("a")).toBe(true);
    expect(await service.recordView("a")).toBe(true);
    expect(await service.recordView("a")).toBe(true);

    expect((await service.getBySlug("a"))?.views).toBe(3);
    expect((await service.listPage(1))?.posts[0]).toMatchObject({ views: 3 });
  });

  it("ignores drafts, deleted posts, and unknown slugs", async () => {
    await posts.insert(post({ id: "draft", status: "DRAFT" }), NOW);
    await posts.insert(post({ id: "gone" }), NOW);
    await posts.softDelete("gone", NOW);

    expect(await service.recordView("draft")).toBe(false);
    expect(await service.recordView("gone")).toBe(false);
    expect(await service.recordView("missing")).toBe(false);

    const { results } = await db.prepare("SELECT * FROM post_view").all();
    expect(results).toEqual([]);
  });

  it("leaves the post version token alone", async () => {
    const inserted = await posts.insert(post({ id: "a" }), NOW);

    await service.recordView("a");

    expect((await posts.findById("a"))?.updatedAt).toEqual(inserted.updatedAt);
  });
});

describe("likes (FR-BLOG-20)", () => {
  it("toggles one like per visitor and counts all visitors", async () => {
    await posts.insert(post({ id: "a" }), NOW);

    expect(await service.toggleLike("a", VISITOR_A)).toEqual({
      liked: true,
      likes: 1,
    });
    expect(await service.toggleLike("a", VISITOR_B)).toEqual({
      liked: true,
      likes: 2,
    });
    expect(await service.toggleLike("a", VISITOR_A)).toEqual({
      liked: false,
      likes: 1,
    });

    expect((await service.getBySlug("a", VISITOR_A))?.liked).toBe(false);
    expect((await service.getBySlug("a", VISITOR_B))?.liked).toBe(true);
    expect((await service.getBySlug("a"))?.liked).toBe(false);
    expect((await service.listPage(1))?.posts[0]).toMatchObject({ likes: 1 });
  });

  it("refuses drafts and unknown slugs", async () => {
    await posts.insert(post({ id: "draft", status: "DRAFT" }), NOW);

    expect(await service.toggleLike("draft", VISITOR_A)).toBeNull();
    expect(await service.toggleLike("missing", VISITOR_A)).toBeNull();
  });

  it("keeps counts per post", async () => {
    await posts.insert(post({ id: "a" }), NOW);
    await posts.insert(post({ id: "b" }), NOW);
    await service.toggleLike("a", VISITOR_A);
    await service.recordView("b");

    const counts = await posts.countEngagement(["a", "b", "c"]);

    expect(counts.get("a")).toEqual({ views: 0, likes: 1 });
    expect(counts.get("b")).toEqual({ views: 1, likes: 0 });
    expect(counts.has("c")).toBe(false);
  });
});

describe("rate limit", () => {
  const rule = { scope: "test", max: 2, windowMs: 60_000 };

  it("allows up to the limit within a window, then resets", async () => {
    const limiter = createRateLimiter(db);
    const start = new Date("2026-11-25T00:00:00.000Z");
    const inWindow = new Date(start.getTime() + 30_000);
    const nextWindow = new Date(start.getTime() + 60_000);

    expect(await limiter.allow(rule, "ip", start)).toBe(true);
    expect(await limiter.allow(rule, "ip", inWindow)).toBe(true);
    expect(await limiter.allow(rule, "ip", inWindow)).toBe(false);
    expect(await limiter.allow(rule, "other", inWindow)).toBe(true);
    expect(await limiter.allow(rule, "ip", nextWindow)).toBe(true);
  });
});
