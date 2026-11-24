import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  createEditorBackgroundRepository,
  type EditorBackgroundRepository,
} from "@/features/media/server/editor-background.repository";
import {
  createPostRepository,
  type PostRepository,
} from "@/features/post/server/post.repository";

import {
  clearContentTables,
  createMigratedDatabase,
  SAMPLE_DOCUMENT,
  type TestDatabase,
} from "../helpers/d1";

let database: TestDatabase;
let db: D1Database;
let posts: PostRepository;
let backgrounds: EditorBackgroundRepository;

const NOW = new Date("2026-11-24T08:00:00.000Z");

async function insertMedia(id: string): Promise<void> {
  await db
    .prepare(
      `INSERT INTO media (id, storage_key, mime_type, width, height, size_bytes)
       VALUES (?, ?, 'image/jpeg', 1200, 800, 1000)`,
    )
    .bind(id, `media/${id}.jpg`)
    .run();
}

async function insertPost(id: string): Promise<void> {
  await posts.insert(
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

beforeAll(async () => {
  database = await createMigratedDatabase();
  db = database.db;
  posts = createPostRepository(db);
  backgrounds = createEditorBackgroundRepository(db);
}, 30_000);

afterAll(async () => {
  await database.dispose();
});

beforeEach(async () => {
  await clearContentTables(db);
});

describe("listMediaIdsInUse", () => {
  it("drops a background once its post is deleted", async () => {
    await insertMedia("media0000000001");
    await insertMedia("media0000000002");
    await insertPost("live");
    await insertPost("gone");
    await backgrounds.saveForPost(
      "live",
      { mediaId: "media0000000001", opacity: 50 },
      NOW,
    );
    await backgrounds.saveForPost(
      "gone",
      { mediaId: "media0000000002", opacity: 50 },
      NOW,
    );

    await posts.softDelete("gone", NOW);

    expect(await backgrounds.listMediaIdsInUse("owner")).toEqual([
      "media0000000001",
    ]);
  });
});
