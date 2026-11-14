import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { isOwnerSession } from "@/features/auth/server/owner";
import { PostAccessDeniedError, type PostInput } from "@/features/post";
import { createPostRepository } from "@/features/post/server/post.repository";
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
    // The real rule, so these tests fail if the owner check changes.
    isOwner: isOwnerSession,
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
    // Publishing belongs to Issue #15, so set the state through the repository.
    await createPostRepository(db).update(
      live.id,
      { status: "PUBLISHED", publishedAt: LATER },
      LATER,
    );
    const removed = await createPost({ slug: "removed" });
    vi.spyOn(console, "info").mockImplementation(() => {});
    await service.remove(OWNER, removed.id);
    vi.restoreAllMocks();

    const groups = await service.listByStatus(OWNER);

    expect(groups.DRAFT.map((post) => post.id)).toEqual([second.id, first.id]);
    expect(groups.PUBLISHED.map((post) => post.id)).toEqual([live.id]);
    expect(groups.DRAFT[0]).not.toHaveProperty("content");
  });
});
