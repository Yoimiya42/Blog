import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { isOwnerSession } from "@/features/auth/server/owner";
import { PostAccessDeniedError, type PostInput } from "@/features/post";
import { createMediaRepository } from "@/features/media/server/media.repository";
import { createPostRepository } from "@/features/post/server/post.repository";
import { createTagRepository } from "@/features/tag";
import {
  createPostService,
  type PostService,
} from "@/features/post/server/post.service";

import {
  clearContentTables,
  createMigratedDatabase,
  SAMPLE_DOCUMENT,
  type TestDatabase,
} from "../helpers/d1";

const OWNER = { user: { role: "OWNER" } };
const VISITOR = { user: { role: "VISITOR" } };

const CREATED = new Date("2026-11-14T08:00:00.000Z");
const LATER = new Date("2026-11-14T09:30:00.000Z");

let database: TestDatabase;
let db: D1Database;
let service: PostService;
let clock: Date;
let nextId: number;

function input(overrides: Partial<PostInput> = {}): PostInput {
  return { title: "Hello", slug: "hello", summary: "", ...overrides };
}

async function createPost(overrides: Partial<PostInput> = {}) {
  const result = await service.create(OWNER, input(overrides));
  if (!result.ok) throw new Error("expected the post to be created");

  return result.post;
}

async function countRows(): Promise<number> {
  const row = await db
    .prepare("SELECT count(*) AS total FROM post")
    .first<{ total: number }>();

  return row?.total ?? 0;
}

beforeAll(async () => {
  database = await createMigratedDatabase();
  db = database.db;
  service = createPostService({
    posts: createPostRepository(db),
    tags: createTagRepository(db),
    // The real rule, so these tests fail if the owner check changes.
    isOwner: isOwnerSession,
    media: createMediaRepository(db),
    now: () => clock,
    newId: () => `post-${++nextId}`,
  });
}, 30_000);

afterAll(async () => {
  await database.dispose();
});

beforeEach(async () => {
  await clearContentTables(db);
  clock = CREATED;
  nextId = 0;
});

describe("authorisation", () => {
  const calls: [string, (actor: unknown) => Promise<unknown>][] = [
    ["listByStatus", (actor) => service.listByStatus(actor as never)],
    ["getById", (actor) => service.getById(actor as never, "post-1")],
    ["create", (actor) => service.create(actor as never, input())],
    ["update", (actor) => service.update(actor as never, "post-1", input())],
    ["remove", (actor) => service.remove(actor as never, "post-1")],
    ["publish", (actor) => service.publish(actor as never, "post-1")],
    ["unpublish", (actor) => service.unpublish(actor as never, "post-1")],
    [
      "autosave",
      (actor) =>
        service.autosave(actor as never, "post-1", SAMPLE_DOCUMENT, CREATED),
    ],
  ];

  it.each(calls)("%s rejects a missing session", async (_name, call) => {
    await expect(call(null)).rejects.toBeInstanceOf(PostAccessDeniedError);
  });

  it.each(calls)("%s rejects a signed-in visitor", async (_name, call) => {
    await expect(call(VISITOR)).rejects.toBeInstanceOf(PostAccessDeniedError);
  });

  it("leaves data untouched when a visitor mutates", async () => {
    const post = await createPost();

    await expect(
      service.update(VISITOR, post.id, input({ title: "Hijacked" })),
    ).rejects.toBeInstanceOf(PostAccessDeniedError);
    await expect(service.remove(VISITOR, post.id)).rejects.toBeInstanceOf(
      PostAccessDeniedError,
    );
    await expect(
      service.create(VISITOR, input({ slug: "spam" })),
    ).rejects.toBeInstanceOf(PostAccessDeniedError);

    expect(await countRows()).toBe(1);
    expect(await service.getById(OWNER, post.id)).toMatchObject({
      title: "Hello",
    });
  });
});

describe("media references", () => {
  const withImage = (mediaId: string) => ({
    type: "doc",
    content: [{ type: "image", attrs: { mediaId, alt: "" } }],
  });

  async function insertMedia(id: string) {
    await db
      .prepare(
        `INSERT INTO media (id, storage_key, mime_type, width, height, size_bytes)
         VALUES (?, ?, 'image/jpeg', 10, 10, 100)`,
      )
      .bind(id, `media/${id}.jpg`)
      .run();
  }

  it("rejects an image node that names no stored media", async () => {
    const result = await service.create(
      OWNER,
      input({ content: withImage("missingmedia00000001") }),
    );

    expect(result).toMatchObject({
      ok: false,
      fieldErrors: {
        content: "content: unknown media reference: missingmedia00000001",
      },
    });
    expect(await countRows()).toBe(0);
  });

  it("accepts stored media and refuses to publish once it is deleted", async () => {
    await insertMedia("storedmedia000000001");
    const post = await createPost({
      content: withImage("storedmedia000000001"),
    });

    await db.prepare("UPDATE media SET deleted_at = 1").run();

    // Saving still works, so deletion never blocks editing (ADR-0025).
    expect(
      await service.update(
        OWNER,
        post.id,
        input({ content: withImage("storedmedia000000001") }),
      ),
    ).toMatchObject({ ok: true });

    expect(await service.publish(OWNER, post.id)).toMatchObject({
      ok: false,
      reason: "invalid",
      fieldErrors: {
        content:
          "content: image storedmedia000000001 was deleted from the media library. Remove it before publishing.",
      },
    });
  });
});

describe("cover", () => {
  async function insertMedia(id: string) {
    await db
      .prepare(
        `INSERT INTO media (id, storage_key, mime_type, width, height, size_bytes)
         VALUES (?, ?, 'image/jpeg', 10, 10, 100)`,
      )
      .bind(id, `media/${id}.jpg`)
      .run();
  }

  it("rejects a cover that names no stored media", async () => {
    const result = await service.create(
      OWNER,
      input({ coverId: "missingmedia00000001" }),
    );

    expect(result).toMatchObject({
      ok: false,
      fieldErrors: { coverId: "Choose a cover from the library." },
    });
    expect(await countRows()).toBe(0);
  });

  it("sets, keeps, and removes the cover", async () => {
    await insertMedia("covermedia0000000001");
    const post = await createPost({ coverId: "covermedia0000000001" });
    expect(post.coverId).toBe("covermedia0000000001");

    // Omitted keeps the stored cover.
    const kept = await service.update(OWNER, post.id, input());
    expect(kept).toMatchObject({
      ok: true,
      post: { coverId: "covermedia0000000001" },
    });

    const removed = await service.update(
      OWNER,
      post.id,
      input({ coverId: null }),
    );
    expect(removed).toMatchObject({ ok: true, post: { coverId: null } });
  });

  it("publishes with a deleted cover", async () => {
    await insertMedia("covermedia0000000002");
    const post = await createPost({ coverId: "covermedia0000000002" });
    await db.prepare("UPDATE media SET deleted_at = 1").run();

    // The list renders without a cover instead (FR-BLOG-14).
    expect(await service.update(OWNER, post.id, input())).toMatchObject({
      ok: true,
    });
    const published = await service.publish(OWNER, post.id);
    expect(published).toMatchObject({ ok: true });
  });
});

describe("pin (FR-ADMIN-29)", () => {
  it("pins, keeps, and unpins a post", async () => {
    const post = await createPost();
    expect(post.pinnedAt).toBeNull();

    const pinned = await service.update(
      OWNER,
      post.id,
      input({ pinned: true }),
    );
    if (!pinned.ok) throw new Error("expected the pin to save");
    const pinnedAt = pinned.post.pinnedAt;
    expect(pinnedAt).toBeInstanceOf(Date);

    // Omitted or repeated keeps the original pin time.
    const kept = await service.update(OWNER, post.id, input({ pinned: true }));
    expect(kept).toMatchObject({ ok: true, post: { pinnedAt } });
    expect(await service.update(OWNER, post.id, input())).toMatchObject({
      ok: true,
      post: { pinnedAt },
    });

    const unpinned = await service.update(
      OWNER,
      post.id,
      input({ pinned: false }),
    );
    expect(unpinned).toMatchObject({ ok: true, post: { pinnedAt: null } });
  });

  it("refuses a fourth pin and keeps the post unchanged", async () => {
    for (const slug of ["one", "two", "three"]) {
      await createPost({ slug, pinned: true });
    }
    const fourth = await createPost({ slug: "four" });

    const result = await service.update(
      OWNER,
      fourth.id,
      input({ slug: "four", pinned: true }),
    );
    expect(result).toMatchObject({
      ok: false,
      reason: "invalid",
      fieldErrors: { pinned: "Up to 3 posts can be pinned. Unpin one first." },
    });
    expect((await service.getById(OWNER, fourth.id))?.pinnedAt).toBeNull();

    // An already pinned post saves while the limit is full.
    expect(
      await service.update(
        OWNER,
        "post-1",
        input({ slug: "one", pinned: true }),
      ),
    ).toMatchObject({ ok: true });
  });
});

describe("create", () => {
  it("creates a draft with a valid empty document", async () => {
    const post = await createPost({ title: "  Hello  ", summary: "   " });

    expect(post).toMatchObject({
      id: "post-1",
      title: "Hello",
      slug: "hello",
      summary: null,
      status: "DRAFT",
      publishedAt: null,
      contentSchemaVersion: 1,
      content: { type: "doc", content: [{ type: "paragraph" }] },
    });
    expect(post.createdAt).toEqual(CREATED);
  });

  it("stores a supplied document", async () => {
    const post = await createPost({ content: SAMPLE_DOCUMENT });

    expect(post.content).toEqual(SAMPLE_DOCUMENT);
  });

  it("reports every invalid field and stores nothing", async () => {
    const result = await service.create(OWNER, {
      title: "   ",
      slug: "Not A Slug",
      summary: "x".repeat(301),
      content: { type: "doc", content: [{ type: "script" }] },
    });

    expect(result).toMatchObject({ ok: false, reason: "invalid" });
    if (result.ok || result.reason !== "invalid")
      throw new Error("unreachable");
    expect(Object.keys(result.fieldErrors).sort()).toEqual([
      "content",
      "slug",
      "summary",
      "title",
    ]);
    expect(await countRows()).toBe(0);
  });

  it.each(["-lead", "trail-", "double--hyphen", "UPPER", "sp ace", "中文"])(
    "rejects the slug %s",
    async (slug) => {
      const result = await service.create(OWNER, input({ slug }));

      expect(result).toMatchObject({
        ok: false,
        reason: "invalid",
        fieldErrors: { slug: expect.any(String) },
      });
    },
  );

  it("rejects non-string fields from a forged request", async () => {
    const result = await service.create(OWNER, {
      title: ["a"],
      slug: null,
    } as unknown as PostInput);

    expect(result).toMatchObject({
      ok: false,
      reason: "invalid",
      fieldErrors: { title: expect.any(String), slug: expect.any(String) },
    });
  });

  it("reports a taken slug on the slug field", async () => {
    await createPost();

    const result = await service.create(OWNER, input({ title: "Again" }));

    expect(result).toEqual({
      ok: false,
      reason: "invalid",
      fieldErrors: { slug: expect.any(String) },
    });
    expect(await countRows()).toBe(1);
  });
});

describe("update", () => {
  it("updates fields and keeps content, status, and publish time", async () => {
    const post = await createPost({ content: SAMPLE_DOCUMENT });
    clock = LATER;

    const result = await service.update(
      OWNER,
      post.id,
      input({ title: "Renamed", slug: "renamed", summary: "Short." }),
    );

    expect(result).toMatchObject({
      ok: true,
      post: {
        title: "Renamed",
        slug: "renamed",
        summary: "Short.",
        status: "DRAFT",
        publishedAt: null,
        content: SAMPLE_DOCUMENT,
        createdAt: CREATED,
        updatedAt: LATER,
      },
    });
  });

  it("replaces content when supplied", async () => {
    const post = await createPost();

    const result = await service.update(
      OWNER,
      post.id,
      input({ content: SAMPLE_DOCUMENT }),
    );

    expect(result).toMatchObject({
      ok: true,
      post: { content: SAMPLE_DOCUMENT },
    });
  });

  it("rejects invalid content and keeps the stored document", async () => {
    const post = await createPost({ content: SAMPLE_DOCUMENT });

    const result = await service.update(
      OWNER,
      post.id,
      input({ title: "Renamed", content: { type: "doc", content: [] } }),
    );

    expect(result).toMatchObject({
      ok: false,
      reason: "invalid",
      fieldErrors: { content: expect.any(String) },
    });
    expect(await service.getById(OWNER, post.id)).toMatchObject({
      title: "Hello",
      content: SAMPLE_DOCUMENT,
    });
  });

  it("allows saving a post under its own slug", async () => {
    const post = await createPost();

    const result = await service.update(OWNER, post.id, input());

    expect(result.ok).toBe(true);
  });

  it("reports a slug taken by another post", async () => {
    await createPost();
    const other = await createPost({ slug: "other" });

    const result = await service.update(OWNER, other.id, input());

    expect(result).toEqual({
      ok: false,
      reason: "invalid",
      fieldErrors: { slug: expect.any(String) },
    });
  });

  it("reports a missing post", async () => {
    const result = await service.update(OWNER, "missing", input());

    expect(result).toEqual({ ok: false, reason: "not_found" });
  });
});

describe("version token", () => {
  it("applies an update that carries the current token", async () => {
    const post = await createPost();
    clock = LATER;

    const result = await service.update(
      OWNER,
      post.id,
      input({ title: "Renamed" }),
      { ifUpdatedAt: post.updatedAt },
    );

    expect(result).toMatchObject({ ok: true, post: { title: "Renamed" } });
  });

  it("rejects a stale token and keeps the newer version", async () => {
    const post = await createPost();
    clock = LATER;
    await service.update(OWNER, post.id, input({ title: "Newer" }));

    const result = await service.update(
      OWNER,
      post.id,
      input({ title: "Stale" }),
      { ifUpdatedAt: post.updatedAt },
    );

    expect(result).toEqual({ ok: false, reason: "conflict" });
    expect(await service.getById(OWNER, post.id)).toMatchObject({
      title: "Newer",
    });
  });

  it("issues a new token for two writes in the same millisecond", async () => {
    const post = await createPost();

    const first = await service.update(OWNER, post.id, input());
    const second = await service.update(OWNER, post.id, input());
    if (!first.ok || !second.ok) throw new Error("expected both to save");

    expect(first.post.updatedAt.getTime()).toBeGreaterThan(
      post.updatedAt.getTime(),
    );
    expect(second.post.updatedAt.getTime()).toBeGreaterThan(
      first.post.updatedAt.getTime(),
    );
  });
});

describe("autosave", () => {
  it("saves the document of a draft and returns the new token", async () => {
    const post = await createPost();
    clock = LATER;

    const result = await service.autosave(
      OWNER,
      post.id,
      SAMPLE_DOCUMENT,
      post.updatedAt,
    );

    expect(result).toEqual({ ok: true, updatedAt: LATER });
    expect(await service.getById(OWNER, post.id)).toMatchObject({
      title: "Hello",
      content: SAMPLE_DOCUMENT,
      status: "DRAFT",
    });
  });

  it("does not overwrite content saved after the token was issued", async () => {
    const post = await createPost();
    clock = LATER;
    await service.update(OWNER, post.id, input({ content: SAMPLE_DOCUMENT }));

    const result = await service.autosave(
      OWNER,
      post.id,
      { type: "doc", content: [{ type: "paragraph" }] },
      post.updatedAt,
    );

    expect(result).toEqual({ ok: false, reason: "conflict" });
    expect(await service.getById(OWNER, post.id)).toMatchObject({
      content: SAMPLE_DOCUMENT,
    });
  });

  it("saves a given title with the document", async () => {
    const post = await createPost();
    clock = LATER;

    const result = await service.autosave(
      OWNER,
      post.id,
      SAMPLE_DOCUMENT,
      post.updatedAt,
      "  Renamed  ",
    );

    expect(result).toEqual({ ok: true, updatedAt: LATER });
    expect(await service.getById(OWNER, post.id)).toMatchObject({
      title: "Renamed",
      content: SAMPLE_DOCUMENT,
    });
  });

  it("rejects a blank title and keeps the stored one", async () => {
    const post = await createPost();

    const result = await service.autosave(
      OWNER,
      post.id,
      SAMPLE_DOCUMENT,
      post.updatedAt,
      " ",
    );

    expect(result).toMatchObject({ ok: false, reason: "invalid" });
    expect(await service.getById(OWNER, post.id)).toMatchObject({
      title: "Hello",
    });
  });

  it("rejects an invalid document", async () => {
    const post = await createPost({ content: SAMPLE_DOCUMENT });

    const result = await service.autosave(
      OWNER,
      post.id,
      { type: "doc", content: [{ type: "script" }] },
      post.updatedAt,
    );

    expect(result).toMatchObject({ ok: false, reason: "invalid" });
    expect(await service.getById(OWNER, post.id)).toMatchObject({
      content: SAMPLE_DOCUMENT,
    });
  });

  it("refuses a published post", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    const post = await createPost();
    const published = await service.publish(OWNER, post.id);
    if (!published.ok) throw new Error("expected the post to be published");

    const result = await service.autosave(
      OWNER,
      post.id,
      SAMPLE_DOCUMENT,
      published.post.updatedAt,
    );

    expect(result).toEqual({ ok: false, reason: "not_draft" });
    vi.restoreAllMocks();
  });

  it("reports a missing post", async () => {
    expect(
      await service.autosave(OWNER, "missing", SAMPLE_DOCUMENT, CREATED),
    ).toEqual({ ok: false, reason: "not_found" });
  });
});

describe("publish and unpublish", () => {
  beforeEach(() => {
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("publishes a draft and dates it", async () => {
    const post = await createPost();
    clock = LATER;

    const result = await service.publish(OWNER, post.id);

    expect(result).toMatchObject({
      ok: true,
      post: { status: "PUBLISHED", publishedAt: LATER },
    });
    expect(console.info).toHaveBeenCalledWith(
      JSON.stringify({ event: "post.publish", postId: post.id }),
    );
    expect((await service.listByStatus(OWNER)).PUBLISHED).toHaveLength(1);
  });

  it("unpublishes and keeps the first publication date", async () => {
    const post = await createPost();
    await service.publish(OWNER, post.id);
    clock = LATER;

    const unpublished = await service.unpublish(OWNER, post.id);
    expect(unpublished).toMatchObject({
      ok: true,
      post: { status: "DRAFT", publishedAt: CREATED },
    });

    const republished = await service.publish(OWNER, post.id);
    expect(republished).toMatchObject({
      ok: true,
      post: { status: "PUBLISHED", publishedAt: CREATED },
    });
  });

  it("does not publish over a newer version", async () => {
    const post = await createPost();
    clock = LATER;
    await service.update(OWNER, post.id, input({ title: "Newer" }));

    const result = await service.publish(OWNER, post.id, {
      ifUpdatedAt: post.updatedAt,
    });

    expect(result).toEqual({ ok: false, reason: "conflict" });
    expect(await service.getById(OWNER, post.id)).toMatchObject({
      status: "DRAFT",
      publishedAt: null,
    });
  });

  it("does not unpublish over a newer version", async () => {
    const post = await createPost();
    const published = await service.publish(OWNER, post.id);
    if (!published.ok) throw new Error("expected the post to be published");
    clock = LATER;
    await service.update(OWNER, post.id, input({ title: "Newer" }));

    const result = await service.unpublish(OWNER, post.id, {
      ifUpdatedAt: published.post.updatedAt,
    });

    expect(result).toEqual({ ok: false, reason: "conflict" });
    expect(await service.getById(OWNER, post.id)).toMatchObject({
      status: "PUBLISHED",
    });
  });

  it("refuses to publish content the public renderer cannot read", async () => {
    const post = await createPost();
    await createPostRepository(db).update(
      post.id,
      { contentSchemaVersion: 99 },
      LATER,
    );

    const result = await service.publish(OWNER, post.id);

    expect(result).toMatchObject({
      ok: false,
      reason: "invalid",
      fieldErrors: { content: expect.any(String) },
    });
    expect(await service.getById(OWNER, post.id)).toMatchObject({
      status: "DRAFT",
    });
  });

  it("reports a missing post", async () => {
    expect(await service.publish(OWNER, "missing")).toEqual({
      ok: false,
      reason: "not_found",
    });
    expect(await service.unpublish(OWNER, "missing")).toEqual({
      ok: false,
      reason: "not_found",
    });
  });
});

describe("slug freeze", () => {
  beforeEach(() => {
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects a slug change on a published post", async () => {
    const post = await createPost();
    await service.publish(OWNER, post.id);

    const result = await service.update(
      OWNER,
      post.id,
      input({ title: "Renamed", slug: "renamed" }),
    );

    expect(result).toEqual({
      ok: false,
      reason: "invalid",
      fieldErrors: { slug: expect.any(String) },
    });
    expect(await service.getById(OWNER, post.id)).toMatchObject({
      title: "Hello",
      slug: "hello",
    });
  });

  it("keeps the slug frozen after unpublishing", async () => {
    const post = await createPost();
    await service.publish(OWNER, post.id);
    await service.unpublish(OWNER, post.id);

    const result = await service.update(
      OWNER,
      post.id,
      input({ slug: "renamed" }),
    );

    expect(result).toMatchObject({
      ok: false,
      fieldErrors: { slug: expect.any(String) },
    });
  });

  it("still saves other fields of a published post", async () => {
    const post = await createPost();
    await service.publish(OWNER, post.id);

    const result = await service.update(
      OWNER,
      post.id,
      input({ title: "Renamed" }),
    );

    expect(result).toMatchObject({
      ok: true,
      post: { title: "Renamed", slug: "hello", status: "PUBLISHED" },
    });
  });
});

describe("remove", () => {
  it("hides the post, releases its slug, and logs the deletion", async () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    const post = await createPost();

    expect(await service.remove(OWNER, post.id)).toBe(true);
    expect(await service.getById(OWNER, post.id)).toBeNull();
    expect(log).toHaveBeenCalledWith(
      JSON.stringify({ event: "post.delete", postId: post.id }),
    );

    const reused = await service.create(OWNER, input());
    expect(reused.ok).toBe(true);

    log.mockRestore();
  });

  it("returns false for a missing or already deleted post", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    const post = await createPost();
    await service.remove(OWNER, post.id);

    expect(await service.remove(OWNER, post.id)).toBe(false);
    expect(await service.remove(OWNER, "missing")).toBe(false);

    vi.restoreAllMocks();
  });
});

describe("listByStatus", () => {
  it("returns an empty group for every status", async () => {
    expect(await service.listByStatus(OWNER)).toEqual({
      DRAFT: [],
      PUBLISHED: [],
    });
  });

  it("groups posts by status, most recently edited first", async () => {
    const first = await createPost({ slug: "first" });
    clock = LATER;
    const second = await createPost({ slug: "second" });
    const live = await createPost({ slug: "live" });
    vi.spyOn(console, "info").mockImplementation(() => {});
    await service.publish(OWNER, live.id);
    const removed = await createPost({ slug: "removed" });
    await service.remove(OWNER, removed.id);
    vi.restoreAllMocks();

    const groups = await service.listByStatus(OWNER);

    expect(groups.DRAFT.map((post) => post.id)).toEqual([second.id, first.id]);
    expect(groups.PUBLISHED.map((post) => post.id)).toEqual([live.id]);
    expect(groups.DRAFT[0]).not.toHaveProperty("content");
  });
});

describe("tags", () => {
  const tagNames = async (postId: string) =>
    (await service.listTags(OWNER, postId)).map((tag) => tag.name);

  it("creates unknown tags and assigns them on create", async () => {
    const result = await service.create(
      OWNER,
      input({ tags: "Go, Cloudflare Workers，数据库" }),
    );
    if (!result.ok) throw new Error("expected the post to be created");

    expect(result.tags?.map((tag) => tag.slug)).toEqual([
      "go",
      "cloudflare-workers",
      "数据库",
    ]);
    expect((await tagNames(result.post.id)).sort()).toEqual(
      ["Cloudflare Workers", "Go", "数据库"].sort(),
    );
  });

  it("reuses an existing tag by slug and keeps its stored name", async () => {
    const first = await createPost({ tags: "Go" });
    const second = await service.create(
      OWNER,
      input({ slug: "second", tags: "go" }),
    );
    if (!second.ok) throw new Error("expected the post to be created");

    expect(second.tags?.[0]?.name).toBe("Go");
    expect(await tagNames(first.id)).toEqual(["Go"]);
    const row = await db
      .prepare("SELECT count(*) AS total FROM tag")
      .first<{ total: number }>();
    expect(row?.total).toBe(1);
  });

  it("replaces the tag set on update and keeps it when tags are omitted", async () => {
    const post = await createPost({ tags: "Go, SQLite" });

    await service.update(OWNER, post.id, input({ tags: "SQLite" }));
    expect(await tagNames(post.id)).toEqual(["SQLite"]);

    await service.update(OWNER, post.id, input({ title: "Renamed" }));
    expect(await tagNames(post.id)).toEqual(["SQLite"]);

    await service.update(OWNER, post.id, input({ tags: "" }));
    expect(await tagNames(post.id)).toEqual([]);
  });

  it("lets a stale save change neither the post nor its tags", async () => {
    const post = await createPost({ tags: "Go" });
    // Another tab saved after this one loaded the post.
    clock = LATER;
    const newer = await service.update(
      OWNER,
      post.id,
      input({ title: "Newer", tags: "SQLite" }),
      { ifUpdatedAt: post.updatedAt },
    );
    if (!newer.ok) throw new Error("expected the newer save to apply");

    const stale = await service.update(
      OWNER,
      post.id,
      input({ title: "Stale", tags: "Rust" }),
      { ifUpdatedAt: post.updatedAt },
    );

    expect(stale).toEqual({ ok: false, reason: "conflict" });
    expect(await tagNames(post.id)).toEqual(["SQLite"]);
    expect((await service.getById(OWNER, post.id))?.title).toBe("Newer");
  });

  it("rolls back the post write when a tag cannot be linked", async () => {
    const post = await createPost({ tags: "Go" });
    const posts = createPostRepository(db);

    await expect(
      posts.update(post.id, { title: "Broken" }, LATER, {}, ["missing-tag"]),
    ).rejects.toThrow();

    expect((await service.getById(OWNER, post.id))?.title).toBe("Hello");
    expect(await tagNames(post.id)).toEqual(["Go"]);
  });

  it("creates no post when a tag cannot be linked", async () => {
    const posts = createPostRepository(db);

    await expect(
      posts.insert(
        {
          id: "orphan",
          slug: "orphan",
          title: "Orphan",
          summary: null,
          content: SAMPLE_DOCUMENT,
          contentSchemaVersion: 1,
          status: "DRAFT",
          publishedAt: null,
        },
        CREATED,
        ["missing-tag"],
      ),
    ).rejects.toThrow();

    expect(await countRows()).toBe(0);
  });

  it("rejects invalid tags without writing the post", async () => {
    const result = await service.create(
      OWNER,
      input({ tags: Array.from({ length: 11 }, (_, i) => `t${i}`).join(",") }),
    );

    expect(result).toEqual({
      ok: false,
      reason: "invalid",
      fieldErrors: { tags: "Use at most 10 tags." },
    });
    expect(await countRows()).toBe(0);
  });

  it("requires the owner to read tags", async () => {
    await expect(service.listTags(VISITOR, "post-1")).rejects.toBeInstanceOf(
      PostAccessDeniedError,
    );
  });
});

describe("blank draft", () => {
  it("rejects a non-owner", async () => {
    await expect(service.createBlankDraft(VISITOR)).rejects.toBeInstanceOf(
      PostAccessDeniedError,
    );
  });

  it("creates an untitled draft with a placeholder slug", async () => {
    const post = await service.createBlankDraft(OWNER);

    expect(post).toMatchObject({
      title: "Untitled",
      status: "DRAFT",
      publishedAt: null,
    });
    expect(post.slug).toMatch(/^untitled-[0-9a-f]{6}$/);
  });

  it("reuses an untouched blank draft", async () => {
    const first = await service.createBlankDraft(OWNER);
    const second = await service.createBlankDraft(OWNER);

    expect(second.id).toBe(first.id);
    expect(await countRows()).toBe(1);
  });

  it("creates a new draft once the blank one has content", async () => {
    const first = await service.createBlankDraft(OWNER);
    await service.autosave(OWNER, first.id, SAMPLE_DOCUMENT, first.updatedAt);

    const second = await service.createBlankDraft(OWNER);

    expect(second.id).not.toBe(first.id);
    expect(await countRows()).toBe(2);
  });

  it("refuses to publish while the slug is a placeholder", async () => {
    const post = await service.createBlankDraft(OWNER);

    const result = await service.publish(OWNER, post.id);

    expect(result).toMatchObject({
      ok: false,
      reason: "invalid",
      fieldErrors: { slug: expect.any(String) },
    });
  });
});
