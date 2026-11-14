import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { TagSlugTakenError } from "@/features/tag";
import { createPostRepository } from "@/features/post/server/post.repository";
import {
  createTagRepository,
  type TagRepository,
} from "@/features/tag/server/tag.repository";

import {
  clearContentTables,
  createMigratedDatabase,
  SAMPLE_DOCUMENT,
  type TestDatabase,
} from "../helpers/d1";

let database: TestDatabase;
let db: D1Database;
let tags: TagRepository;

const NOW = new Date("2026-11-14T08:00:00.000Z");
const SQLITE = { id: "t1", slug: "sqlite", name: "SQLite" };
const D1 = { id: "t2", slug: "d1", name: "D1" };

beforeAll(async () => {
  database = await createMigratedDatabase();
  db = database.db;
  tags = createTagRepository(db);
}, 30_000);

afterAll(async () => {
  await database.dispose();
});

beforeEach(async () => {
  await clearContentTables(db);
});

async function insertPost(id: string) {
  await createPostRepository(db).insert(
    {
      id,
      slug: id,
      title: id,
      summary: null,
      content: SAMPLE_DOCUMENT,
      contentSchemaVersion: 1,
      status: "DRAFT",
      publishedAt: null,
    },
    NOW,
  );
}

describe("tag repository", () => {
  it("round-trips a tag through insert and findBySlug", async () => {
    expect(await tags.insert(SQLITE)).toEqual(SQLITE);
    expect(await tags.findBySlug("sqlite")).toEqual(SQLITE);
    expect(await tags.findBySlug("missing")).toBeNull();
  });

  it("reports a slug conflict as TagSlugTakenError", async () => {
    await tags.insert(SQLITE);

    await expect(
      tags.insert({ ...SQLITE, id: "other" }),
    ).rejects.toBeInstanceOf(TagSlugTakenError);
  });

  it("lists tags by name", async () => {
    await tags.insert(SQLITE);
    await tags.insert(D1);

    expect(await tags.list()).toEqual([D1, SQLITE]);
  });

  it("groups tags by post in one query", async () => {
    const posts = createPostRepository(db);
    await tags.insert(SQLITE);
    await tags.insert(D1);
    await insertPost("a");
    await insertPost("b");
    await insertPost("c");
    await posts.replaceTags("a", ["t1", "t2"]);
    await posts.replaceTags("b", ["t1"]);

    const tagsByPost = await tags.listByPostIds(["a", "b", "c"]);

    expect(tagsByPost.get("a")).toEqual([D1, SQLITE]);
    expect(tagsByPost.get("b")).toEqual([SQLITE]);
    expect(tagsByPost.has("c")).toBe(false);
    expect(await tags.listByPostIds([])).toEqual(new Map());
  });

  it("deletes a tag and removes it from every post", async () => {
    await tags.insert(SQLITE);
    await insertPost("a");
    await createPostRepository(db).replaceTags("a", ["t1"]);

    expect(await tags.delete("t1")).toBe(true);
    expect(await tags.delete("t1")).toBe(false);
    expect(await tags.listByPostIds(["a"])).toEqual(new Map());
  });
});
