import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { MediaAccessDeniedError } from "@/features/media/schema";
import { createEditorBackgroundRepository } from "@/features/media/server/editor-background.repository";
import { createEditorBackgroundService } from "@/features/media/server/editor-background.service";
import { createMediaRepository } from "@/features/media/server/media.repository";

import {
  clearContentTables,
  createMigratedDatabase,
  type TestDatabase,
} from "../helpers/d1";

let database: TestDatabase;
let db: D1Database;

const OWNER = { user: { id: "owner-1", role: "OWNER" } };
const VISITOR = { user: { id: "visitor-1", role: "VISITOR" } };
const NOW = new Date("2026-11-23T09:00:00.000Z");

beforeAll(async () => {
  database = await createMigratedDatabase();
  db = database.db;
}, 30_000);

afterAll(async () => {
  await database.dispose();
});

beforeEach(async () => {
  await clearContentTables(db);
  await db.prepare("DELETE FROM user").run();
  await db
    .prepare(
      "INSERT INTO user (id, name, email, role) VALUES (?, 'Owner', 'owner@example.com', 'OWNER')",
    )
    .bind(OWNER.user.id)
    .run();
});

function service() {
  return createEditorBackgroundService({
    backgrounds: createEditorBackgroundRepository(db),
    media: createMediaRepository(db),
    isOwner: (actor) => actor?.user.role === "OWNER",
    now: () => NOW,
  });
}

async function insertMedia(id: string, width = 3000) {
  await db
    .prepare(
      `INSERT INTO media (id, storage_key, mime_type, width, height, size_bytes)
       VALUES (?, ?, 'image/jpeg', ?, 2000, 1000)`,
    )
    .bind(id, `media/${id}.jpg`, width)
    .run();
}

const MEDIA_ID = "aaaaaaaaaaaaaaaaaaaa";

describe("editor background service", () => {
  it("defaults to no image at half visibility", async () => {
    expect(await service().get(OWNER)).toEqual({ opacity: 50, image: null });
  });

  it("rejects a non-owner", async () => {
    await expect(service().get(VISITOR)).rejects.toThrow(
      MediaAccessDeniedError,
    );
    await expect(service().update(null, { opacity: 25 })).rejects.toThrow(
      MediaAccessDeniedError,
    );
  });

  it("stores a live image and resolves its delivery URLs", async () => {
    await insertMedia(MEDIA_ID);
    const result = await service().update(OWNER, { mediaId: MEDIA_ID });

    expect(result).toEqual({
      ok: true,
      background: {
        opacity: 50,
        image: {
          mediaId: MEDIA_ID,
          src: `/media/${MEDIA_ID}.jpg?w=1600`,
          srcSet: expect.stringContaining(`/media/${MEDIA_ID}.jpg?w=2400`),
          thumbnailUrl: `/media/${MEDIA_ID}.jpg?w=480`,
        },
      },
    });
    expect((await service().get(OWNER)).image?.mediaId).toBe(MEDIA_ID);
  });

  it("changes the tier and keeps the image", async () => {
    await insertMedia(MEDIA_ID);
    await service().update(OWNER, { mediaId: MEDIA_ID });
    const result = await service().update(OWNER, { opacity: 100 });

    expect(result.ok && result.background.opacity).toBe(100);
    expect(result.ok && result.background.image?.mediaId).toBe(MEDIA_ID);
  });

  it.each([10, "50", null, 150])("rejects tier %s", async (opacity) => {
    expect(await service().update(OWNER, { opacity })).toEqual({
      ok: false,
      reason: "invalid_opacity",
    });
  });

  it("rejects an unknown or deleted image", async () => {
    expect(await service().update(OWNER, { mediaId: "missing" })).toEqual({
      ok: false,
      reason: "media_not_found",
    });

    await insertMedia(MEDIA_ID);
    await db
      .prepare("UPDATE media SET deleted_at = 1 WHERE id = ?")
      .bind(MEDIA_ID)
      .run();
    expect(await service().update(OWNER, { mediaId: MEDIA_ID })).toEqual({
      ok: false,
      reason: "media_not_found",
    });
  });

  it("falls back to no image once the stored image is deleted", async () => {
    await insertMedia(MEDIA_ID);
    await service().update(OWNER, { mediaId: MEDIA_ID, opacity: 75 });
    await db
      .prepare("UPDATE media SET deleted_at = 1 WHERE id = ?")
      .bind(MEDIA_ID)
      .run();

    expect(await service().get(OWNER)).toEqual({ opacity: 75, image: null });
  });

  it("removes the image", async () => {
    await insertMedia(MEDIA_ID);
    await service().update(OWNER, { mediaId: MEDIA_ID });
    const result = await service().update(OWNER, { mediaId: null });

    expect(result).toEqual({
      ok: true,
      background: { opacity: 50, image: null },
    });
  });
});

describe("editor_background constraints", () => {
  it("rejects an off-scale opacity", async () => {
    await expect(
      db
        .prepare(
          "INSERT INTO editor_background (user_id, opacity) VALUES (?, 30)",
        )
        .bind(OWNER.user.id)
        .run(),
    ).rejects.toThrow(/CHECK constraint/);
  });

  it("rejects a row for an unknown user or media id", async () => {
    await expect(
      db
        .prepare("INSERT INTO editor_background (user_id) VALUES ('nobody')")
        .run(),
    ).rejects.toThrow(/FOREIGN KEY/);
    await expect(
      db
        .prepare(
          "INSERT INTO editor_background (user_id, media_id) VALUES (?, 'missing')",
        )
        .bind(OWNER.user.id)
        .run(),
    ).rejects.toThrow(/FOREIGN KEY/);
  });
});
