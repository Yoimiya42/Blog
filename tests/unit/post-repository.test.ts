import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { PostSlugTakenError, type NewPost } from "@/features/post";
import {
  createPostRepository,
  type PostRepository,
} from "@/features/post/server/post.repository";
import { createTagRepository } from "@/features/tag/server/tag.repository";

import {
  clearContentTables,
  createMigratedDatabase,
  SAMPLE_DOCUMENT,
  type TestDatabase,
} from "../helpers/d1";

let database: TestDatabase;
let db: D1Database;
let posts: PostRepository;

const CREATED = new Date("2026-11-14T08:00:00.000Z");
const LATER = new Date("2026-11-14T09:30:00.000Z");

function draft(overrides: Partial<NewPost> = {}): NewPost {
  return {
    id: "post-1",
    slug: "hello",
    title: "Hello",
    summary: null,
    content: SAMPLE_DOCUMENT,
    contentSchemaVersion: 1,
    status: "DRAFT",
    publishedAt: null,
    ...overrides,
  };
}

function published(id: string, publishedAt: string): NewPost {
  return draft({
    id,
    slug: id,
    status: "PUBLISHED",
    publishedAt: new Date(publishedAt),
  });
}

beforeAll(async () => {
  database = await createMigratedDatabase();
  db = database.db;
  posts = createPostRepository(db);
}, 30_000);

afterAll(async () => {
  await database.dispose();
});

beforeEach(async () => {
  await clearContentTables(db);
});

describe("post repository mapping", () => {
  it("round-trips a draft through insert and findById", async () => {
    const inserted = await posts.insert(draft(), CREATED);

    expect(inserted).toEqual({
      id: "post-1",
      slug: "hello",
      title: "Hello",
      summary: null,
      coverId: null,
      pinnedAt: null,
      category: null,
      content: SAMPLE_DOCUMENT,
      contentSchemaVersion: 1,
      status: "DRAFT",
      publishedAt: null,
      createdAt: CREATED,
      updatedAt: CREATED,
    });
    expect(await posts.findById("post-1")).toEqual(inserted);
    expect(await posts.findBySlug("hello")).toEqual(inserted);
  });

  it("sets and clears a cover that names stored media", async () => {
    await db
      .prepare(
        `INSERT INTO media (id, storage_key, mime_type, width, height, size_bytes)
         VALUES ('m1', 'media/m1.jpg', 'image/jpeg', 1200, 800, 100)`,
      )
      .run();
    await posts.insert(draft({ coverId: "m1" }), CREATED);

    expect((await posts.findById("post-1"))?.coverId).toBe("m1");
    expect((await posts.listAll())[0]?.coverId).toBe("m1");

    const cleared = await posts.update("post-1", { coverId: null }, LATER);
    expect(cleared?.coverId).toBeNull();
  });

  it("rejects a cover that names no media row", async () => {
    await expect(
      posts.insert(draft({ coverId: "missing" }), CREATED),
    ).rejects.toThrow();
  });

  it("stores explicit column representations", async () => {
    await posts.insert(
      draft({ status: "PUBLISHED", publishedAt: LATER, summary: "Short" }),
      CREATED,
    );
    const row = await db
      .prepare("SELECT * FROM post WHERE id = 'post-1'")
      .first<Record<string, unknown>>();

    expect(row).toMatchObject({
      status: "PUBLISHED",
      summary: "Short",
      content: JSON.stringify(SAMPLE_DOCUMENT),
      published_at: LATER.getTime(),
      created_at: CREATED.getTime(),
      updated_at: CREATED.getTime(),
      deleted_at: null,
    });
  });

  it("returns null for an unknown id or slug", async () => {
    expect(await posts.findById("missing")).toBeNull();
    expect(await posts.findBySlug("missing")).toBeNull();
  });

  it("reports a slug conflict as PostSlugTakenError", async () => {
    await posts.insert(draft(), CREATED);

    await expect(
      posts.insert(draft({ id: "post-2" }), CREATED),
    ).rejects.toBeInstanceOf(PostSlugTakenError);
  });

  it("does not report a duplicate id as a slug conflict", async () => {
    await posts.insert(draft(), CREATED);
    const duplicate = posts.insert(draft({ slug: "other" }), CREATED);

    await expect(duplicate).rejects.toThrow(
      /UNIQUE constraint failed: post\.id/,
    );
    await expect(duplicate).rejects.not.toBeInstanceOf(PostSlugTakenError);
  });
});

describe("post repository update", () => {
  it("changes only the patched fields and updated_at", async () => {
    const original = await posts.insert(draft({ summary: "Keep" }), CREATED);

    const updated = await posts.update(
      "post-1",
      { title: "Renamed", status: "PUBLISHED", publishedAt: LATER },
      LATER,
    );

    expect(updated).toEqual({
      ...original,
      title: "Renamed",
      status: "PUBLISHED",
      publishedAt: LATER,
      updatedAt: LATER,
    });
  });

  it("clears a nullable field with an explicit null", async () => {
    await posts.insert(draft({ summary: "Remove me" }), CREATED);

    const updated = await posts.update("post-1", { summary: null }, LATER);

    expect(updated?.summary).toBeNull();
  });

  it("replaces content and its schema version", async () => {
    await posts.insert(draft(), CREATED);
    const content = { type: "doc", content: [] };

    const updated = await posts.update(
      "post-1",
      { content, contentSchemaVersion: 2 },
      LATER,
    );

    expect(updated?.content).toEqual(content);
    expect(updated?.contentSchemaVersion).toBe(2);
  });

  it("returns null for a missing post", async () => {
    expect(await posts.update("missing", { title: "X" }, LATER)).toBeNull();
  });

  it("reports a slug conflict as PostSlugTakenError", async () => {
    await posts.insert(draft(), CREATED);
    await posts.insert(draft({ id: "post-2", slug: "second" }), CREATED);

    await expect(
      posts.update("post-2", { slug: "hello" }, LATER),
    ).rejects.toBeInstanceOf(PostSlugTakenError);
  });
});

describe("post repository soft delete", () => {
  it("hides the post from every read and frees its slug", async () => {
    await posts.insert(published("post-1", "2026-11-01T00:00:00Z"), CREATED);

    expect(await posts.softDelete("post-1", LATER)).toBe(true);

    expect(await posts.findById("post-1")).toBeNull();
    expect(await posts.findBySlug("post-1")).toBeNull();
    expect(await posts.listAll()).toEqual([]);
    expect(await posts.listPublished({ limit: 10, offset: 0 })).toEqual([]);
    expect(await posts.countPublished()).toBe(0);
    expect(await posts.update("post-1", { title: "X" }, LATER)).toBeNull();
    await expect(
      posts.insert(draft({ id: "post-2", slug: "post-1" }), LATER),
    ).resolves.toBeDefined();
  });

  it("keeps the row and reports a repeated delete as false", async () => {
    await posts.insert(draft(), CREATED);
    await posts.softDelete("post-1", LATER);

    expect(await posts.softDelete("post-1", LATER)).toBe(false);
    expect(await posts.softDelete("missing", LATER)).toBe(false);
    const row = await db
      .prepare("SELECT deleted_at FROM post WHERE id = 'post-1'")
      .first<{ deleted_at: number }>();
    expect(row?.deleted_at).toBe(LATER.getTime());
  });
});

describe("post repository lists", () => {
  beforeEach(async () => {
    await posts.insert(published("a", "2026-11-01T00:00:00Z"), CREATED);
    await posts.insert(published("b", "2026-11-03T00:00:00Z"), CREATED);
    await posts.insert(published("c", "2026-11-02T00:00:00Z"), CREATED);
    await posts.insert(draft({ id: "d", slug: "d" }), LATER);
  });

  it("lists published posts newest first, without drafts or bodies", async () => {
    const list = await posts.listPublished({ limit: 10, offset: 0 });

    expect(list.map((post) => post.id)).toEqual(["b", "c", "a"]);
    expect(list[0]).not.toHaveProperty("content");
    expect(await posts.countPublished()).toBe(3);
  });

  it("paginates with limit and offset", async () => {
    const page = await posts.listPublished({ limit: 2, offset: 2 });

    expect(page.map((post) => post.id)).toEqual(["a"]);
  });

  it("lists every live post for the admin, most recently edited first", async () => {
    const list = await posts.listAll();

    expect(list).toHaveLength(4);
    expect(list[0]?.id).toBe("d");
  });

  it("filters and counts published posts by tag", async () => {
    const tags = createTagRepository(db);
    await tags.insert({ id: "t1", slug: "sqlite", name: "SQLite" });
    await posts.replaceTags("a", ["t1"]);
    await posts.replaceTags("b", ["t1"]);
    await posts.replaceTags("d", ["t1"]);

    const list = await posts.listPublished({
      limit: 10,
      offset: 0,
      tagId: "t1",
    });

    expect(list.map((post) => post.id)).toEqual(["b", "a"]);
    expect(await posts.countPublished({ tagId: "t1" })).toBe(2);
    expect(await posts.countPublished({ tagId: "missing" })).toBe(0);
  });

  it("lists pinned posts apart from the grid (FR-BLOG-17)", async () => {
    await posts.update("a", { pinnedAt: CREATED }, LATER);
    await posts.update("c", { pinnedAt: LATER }, LATER);
    // A pinned draft counts toward the limit but is never listed.
    await posts.update("d", { pinnedAt: LATER }, LATER);

    const pinned = await posts.listPinnedPublishedWithContent();
    expect(pinned.map((post) => post.id)).toEqual(["c", "a"]);

    const grid = await posts.listPublished({
      limit: 10,
      offset: 0,
      excludePinned: true,
    });
    expect(grid.map((post) => post.id)).toEqual(["b"]);
    expect(await posts.countPublished({ excludePinned: true })).toBe(1);
    expect(await posts.countPinned()).toBe(3);
    expect(await posts.countPinned("d")).toBe(2);
  });
});

describe("post repository tags", () => {
  const tagIdsOf = async (postId: string) => {
    const { results } = await db
      .prepare("SELECT tag_id FROM post_tag WHERE post_id = ? ORDER BY tag_id")
      .bind(postId)
      .all<{ tag_id: string }>();

    return results.map((row) => row.tag_id);
  };

  beforeEach(async () => {
    const tags = createTagRepository(db);
    await posts.insert(draft(), CREATED);
    await tags.insert({ id: "t1", slug: "sqlite", name: "SQLite" });
    await tags.insert({ id: "t2", slug: "d1", name: "D1" });
    await tags.insert({ id: "t3", slug: "workers", name: "Workers" });
  });

  it("replaces the full tag set and ignores duplicates", async () => {
    await posts.replaceTags("post-1", ["t1", "t2", "t1"]);
    expect(await tagIdsOf("post-1")).toEqual(["t1", "t2"]);

    await posts.replaceTags("post-1", ["t3"]);
    expect(await tagIdsOf("post-1")).toEqual(["t3"]);

    await posts.replaceTags("post-1", []);
    expect(await tagIdsOf("post-1")).toEqual([]);
  });

  it("rolls back the whole replacement when a tag is unknown", async () => {
    await posts.replaceTags("post-1", ["t1"]);

    await expect(
      posts.replaceTags("post-1", ["t2", "missing"]),
    ).rejects.toThrow(/FOREIGN KEY/);

    expect(await tagIdsOf("post-1")).toEqual(["t1"]);
  });
});
