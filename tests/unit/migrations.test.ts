import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  clearContentTables,
  createMigratedDatabase,
  listMigrationFiles,
  type TestDatabase,
} from "../helpers/d1";

let database: TestDatabase;
let db: D1Database;

beforeAll(async () => {
  database = await createMigratedDatabase();
  db = database.db;
}, 30_000);

afterAll(async () => {
  await database.dispose();
});

beforeEach(async () => {
  await clearContentTables(db);
});

const POST_INSERT = `INSERT INTO post (id, slug, title, content, status, published_at)
  VALUES (?, ?, ?, ?, ?, ?)`;

function insertPost(
  overrides: Partial<{
    id: string;
    slug: string;
    title: string;
    content: string;
    status: string;
    publishedAt: number | string | null;
  }> = {},
) {
  const row = {
    id: "post-1",
    slug: "hello",
    title: "Hello",
    content: "{}",
    status: "DRAFT",
    publishedAt: null,
    ...overrides,
  };

  return db
    .prepare(POST_INSERT)
    .bind(row.id, row.slug, row.title, row.content, row.status, row.publishedAt)
    .run();
}

describe("migration replay", () => {
  it("numbers migrations sequentially without gaps", () => {
    const numbers = listMigrationFiles().map((name) =>
      Number(name.slice(0, 4)),
    );

    expect(numbers).toEqual(numbers.map((_, index) => index + 1));
  });

  it("creates every table from an empty database", async () => {
    const { results } = await db
      .prepare(
        `SELECT name FROM sqlite_master
         WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
           AND name NOT LIKE '_cf_%' AND name NOT LIKE 'd1_%'
         ORDER BY name`,
      )
      .all<{ name: string }>();

    expect(results.map((row) => row.name)).toEqual([
      "account",
      "editor_background",
      "media",
      "moment",
      "moment_media",
      "post",
      "post_editor_background",
      "post_tag",
      "rate_limit",
      "session",
      "tag",
      "user",
      "verification",
    ]);
  });

  it("leaves no foreign key violation", async () => {
    const { results } = await db.prepare("PRAGMA foreign_key_check").all();

    expect(results).toEqual([]);
  });
});

describe("post constraints", () => {
  it("applies defaults to a minimal draft", async () => {
    await db
      .prepare(
        "INSERT INTO post (id, slug, title, content) VALUES (?, ?, ?, ?)",
      )
      .bind("post-1", "hello", "Hello", "{}")
      .run();
    const row = await db
      .prepare("SELECT * FROM post WHERE id = ?")
      .bind("post-1")
      .first<Record<string, unknown>>();

    expect(row).toMatchObject({
      status: "DRAFT",
      content_schema_version: 1,
      summary: null,
      published_at: null,
      deleted_at: null,
    });
    expect(row?.created_at).toBeTypeOf("number");
    expect(row?.updated_at).toBeTypeOf("number");
  });

  it.each(["SCHEDULED", "ARCHIVED", "draft"])(
    "rejects status %s",
    async (status) => {
      await expect(insertPost({ status })).rejects.toThrow(/CHECK constraint/);
    },
  );

  it("rejects a published post without published_at", async () => {
    await expect(insertPost({ status: "PUBLISHED" })).rejects.toThrow(
      /CHECK constraint/,
    );
    await expect(
      insertPost({ status: "PUBLISHED", publishedAt: 1_700_000_000_000 }),
    ).resolves.toBeDefined();
  });

  it("rejects content that is not JSON", async () => {
    await expect(insertPost({ content: "<p>html</p>" })).rejects.toThrow(
      /CHECK constraint/,
    );
  });

  it("rejects an empty slug or title", async () => {
    await expect(insertPost({ slug: "" })).rejects.toThrow(/CHECK constraint/);
    await expect(insertPost({ title: "" })).rejects.toThrow(/CHECK constraint/);
  });

  it("rejects a text timestamp because the table is STRICT", async () => {
    await expect(
      insertPost({ publishedAt: "2026-11-14T00:00:00.000Z" }),
    ).rejects.toThrow();
  });

  it("keeps live slugs unique and releases a soft-deleted slug", async () => {
    await insertPost();
    await expect(insertPost({ id: "post-2" })).rejects.toThrow(
      /UNIQUE constraint failed: post\.slug/,
    );

    await db
      .prepare("UPDATE post SET deleted_at = 1 WHERE id = 'post-1'")
      .run();

    await expect(insertPost({ id: "post-2" })).resolves.toBeDefined();
  });
});

describe("tag and post_tag constraints", () => {
  const insertTag = (id: string, slug: string, name = "Name") =>
    db
      .prepare("INSERT INTO tag (id, slug, name) VALUES (?, ?, ?)")
      .bind(id, slug, name)
      .run();
  const link = (postId: string, tagId: string) =>
    db
      .prepare("INSERT INTO post_tag (post_id, tag_id) VALUES (?, ?)")
      .bind(postId, tagId)
      .run();
  const countLinks = async () =>
    (
      await db
        .prepare("SELECT count(*) AS total FROM post_tag")
        .first<{ total: number }>()
    )?.total;

  it("keeps tag slugs unique and names non-empty", async () => {
    await insertTag("tag-1", "sqlite");

    await expect(insertTag("tag-2", "sqlite")).rejects.toThrow(
      /UNIQUE constraint failed: tag\.slug/,
    );
    await expect(insertTag("tag-3", "d1", "")).rejects.toThrow(
      /CHECK constraint/,
    );
  });

  it("rejects links to a missing post or tag", async () => {
    await insertPost();
    await insertTag("tag-1", "sqlite");

    await expect(link("post-1", "missing")).rejects.toThrow(/FOREIGN KEY/);
    await expect(link("missing", "tag-1")).rejects.toThrow(/FOREIGN KEY/);
  });

  it("rejects a duplicate link", async () => {
    await insertPost();
    await insertTag("tag-1", "sqlite");
    await link("post-1", "tag-1");

    await expect(link("post-1", "tag-1")).rejects.toThrow(/UNIQUE constraint/);
  });

  it("cascades links when a tag or post row is deleted", async () => {
    await insertPost();
    await insertPost({ id: "post-2", slug: "second" });
    await insertTag("tag-1", "sqlite");
    await insertTag("tag-2", "d1");
    await link("post-1", "tag-1");
    await link("post-1", "tag-2");
    await link("post-2", "tag-2");

    await db.prepare("DELETE FROM tag WHERE id = 'tag-1'").run();
    expect(await countLinks()).toBe(2);

    await db.prepare("DELETE FROM post WHERE id = 'post-1'").run();
    expect(await countLinks()).toBe(1);
  });
});
