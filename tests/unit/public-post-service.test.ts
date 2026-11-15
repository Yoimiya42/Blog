import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type { NewPost } from "@/features/post";
import { createPostRepository } from "@/features/post/server/post.repository";
import {
  createPublicPostService,
  PUBLIC_POSTS_PER_PAGE,
  type PublicPostService,
} from "@/features/post/server/public-post.service";
import { createTagRepository } from "@/features/tag";

import { parsePageNumber } from "@/app/(site)/(blog)/page-number";

import {
  clearContentTables,
  createMigratedDatabase,
  SAMPLE_DOCUMENT,
  type TestDatabase,
} from "../helpers/d1";

const NOW = new Date("2026-11-15T00:00:00.000Z");

let database: TestDatabase;
let db: D1Database;
let posts: ReturnType<typeof createPostRepository>;
let tags: ReturnType<typeof createTagRepository>;
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

/** Published posts p01..pNN, each one day newer than the previous. */
async function insertPublished(count: number): Promise<void> {
  for (let index = 1; index <= count; index += 1) {
    const id = `p${String(index).padStart(2, "0")}`;
    await posts.insert(
      post({ id, publishedAt: new Date(NOW.getTime() + index * 86_400_000) }),
      NOW,
    );
  }
}

beforeAll(async () => {
  database = await createMigratedDatabase();
  db = database.db;
  posts = createPostRepository(db);
  tags = createTagRepository(db);
  service = createPublicPostService({ posts, tags });
}, 30_000);

afterAll(async () => {
  await database.dispose();
});

beforeEach(async () => {
  await clearContentTables(db);
});

describe("public post list", () => {
  it("pages published posts newest first, ten per page", async () => {
    await insertPublished(PUBLIC_POSTS_PER_PAGE + 2);

    const first = await service.listPage(1);
    const second = await service.listPage(2);

    expect(first?.posts.map((entry) => entry.slug)).toEqual([
      "p12",
      "p11",
      "p10",
      "p09",
      "p08",
      "p07",
      "p06",
      "p05",
      "p04",
      "p03",
    ]);
    expect(first).toMatchObject({ page: 1, totalPages: 2, totalPosts: 12 });
    expect(second?.posts.map((entry) => entry.slug)).toEqual(["p02", "p01"]);
  });

  it("hides drafts and soft-deleted posts", async () => {
    await posts.insert(post({ id: "live" }), NOW);
    await posts.insert(
      post({ id: "draft", status: "DRAFT", publishedAt: null }),
      NOW,
    );
    await posts.insert(post({ id: "gone" }), NOW);
    await posts.softDelete("gone", NOW);

    const result = await service.listPage(1);

    expect(result?.posts.map((entry) => entry.slug)).toEqual(["live"]);
    expect(await service.latest(3)).toHaveLength(1);
  });

  it("returns page 1 with no posts and rejects pages out of range", async () => {
    expect(await service.listPage(1)).toMatchObject({
      posts: [],
      totalPages: 1,
    });
    expect(await service.listPage(2)).toBeNull();
    expect(await service.listPage(0)).toBeNull();
    expect(await service.listPage(Number.NaN)).toBeNull();
  });

  it("summarises title, summary, date, tags, and reading time", async () => {
    await tags.insert({ id: "t1", slug: "sqlite", name: "SQLite" });
    await posts.insert(post({ id: "a", summary: "About D1." }), NOW);
    await posts.replaceTags("a", ["t1"]);

    const [entry] = (await service.listPage(1))?.posts ?? [];

    expect(entry).toEqual({
      slug: "a",
      title: "Title a",
      summary: "About D1.",
      publishedAt: NOW,
      tags: [{ id: "t1", slug: "sqlite", name: "SQLite" }],
      readingMinutes: 1,
    });
  });

  it("omits reading time for an invalid stored body instead of failing", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    await posts.insert(post({ id: "bad", content: { type: "doc" } }), NOW);

    const [entry] = (await service.listPage(1))?.posts ?? [];

    expect(entry?.readingMinutes).toBeNull();
    expect(error).toHaveBeenCalledOnce();
    error.mockRestore();
  });
});

describe("tag archive", () => {
  beforeEach(async () => {
    await tags.insert({ id: "t1", slug: "go", name: "Go" });
    await tags.insert({ id: "t2", slug: "empty", name: "Empty" });
    await posts.insert(post({ id: "a" }), NOW);
    await posts.insert(
      post({ id: "d", status: "DRAFT", publishedAt: null }),
      NOW,
    );
    await posts.insert(post({ id: "other" }), NOW);
    await posts.replaceTags("a", ["t1"]);
    await posts.replaceTags("d", ["t1"]);
  });

  it("lists published posts with the tag only", async () => {
    const result = await service.listTagPage("go", 1);

    expect(result?.tag.name).toBe("Go");
    expect(result?.posts.map((entry) => entry.slug)).toEqual(["a"]);
  });

  it("returns an empty archive for a tag without published posts", async () => {
    expect(await service.listTagPage("empty", 1)).toMatchObject({
      posts: [],
      totalPosts: 0,
    });
  });

  it("returns null for an unknown tag", async () => {
    expect(await service.listTagPage("missing", 1)).toBeNull();
  });
});

describe("post by slug", () => {
  it("returns a published post with its document", async () => {
    await posts.insert(post({ id: "a" }), NOW);

    expect(await service.getBySlug("a")).toMatchObject({
      slug: "a",
      isDraft: false,
      document: SAMPLE_DOCUMENT,
    });
  });

  it("flags a draft so the route can apply the owner guard", async () => {
    await posts.insert(
      post({ id: "d", status: "DRAFT", publishedAt: null }),
      NOW,
    );

    expect(await service.getBySlug("d")).toMatchObject({ isDraft: true });
  });

  it("returns null for a missing or deleted post", async () => {
    await posts.insert(post({ id: "gone" }), NOW);
    await posts.softDelete("gone", NOW);

    expect(await service.getBySlug("gone")).toBeNull();
    expect(await service.getBySlug("missing")).toBeNull();
  });
});

describe("page number parsing", () => {
  it.each([
    [undefined, 1],
    ["1", 1],
    ["12", 12],
  ])("parses %s as %s", (raw, expected) => {
    expect(parsePageNumber(raw)).toBe(expected);
  });

  it.each([["0"], ["-1"], ["01"], ["1.5"], ["abc"], [""], [["1", "2"]]])(
    "rejects %s",
    (raw) => {
      expect(parsePageNumber(raw)).toBeNaN();
    },
  );
});
