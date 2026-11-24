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
const NOW = new Date("2026-11-24T09:00:00.000Z");
const MEDIA_ID = "aaaaaaaaaaaaaaaaaaaa";
const OTHER_MEDIA_ID = "bbbbbbbbbbbbbbbbbbbb";
const POST_ID = "post-1";
const OTHER_POST_ID = "post-2";

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
  for (const [id, slug] of [
    [POST_ID, "one"],
    [OTHER_POST_ID, "two"],
  ]) {
    await db
      .prepare(
        "INSERT INTO post (id, slug, title, content) VALUES (?, ?, 'Post', '{}')",
      )
      .bind(id, slug)
      .run();
  }
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

async function deleteMedia(id: string) {
  await db
    .prepare("UPDATE media SET deleted_at = 1 WHERE id = ?")
    .bind(id)
    .run();
}

async function postUpdatedAt(id: string) {
  return (
    await db
      .prepare("SELECT updated_at FROM post WHERE id = ?")
      .bind(id)
      .first<{ updated_at: number }>()
  )?.updated_at;
}

describe("editor background default", () => {
  it("starts with no image at half visibility", async () => {
    expect(await service().getDefault(OWNER)).toEqual({
      opacity: 50,
      image: null,
      source: "default",
    });
  });

  it("rejects a non-owner on every path", async () => {
    const backgrounds = service();
    await expect(backgrounds.getDefault(VISITOR)).rejects.toThrow(
      MediaAccessDeniedError,
    );
    await expect(
      backgrounds.updateDefault(null, { opacity: 25 }),
    ).rejects.toThrow(MediaAccessDeniedError);
    await expect(backgrounds.getForPost(VISITOR, POST_ID)).rejects.toThrow(
      MediaAccessDeniedError,
    );
    await expect(
      backgrounds.updateForPost(VISITOR, POST_ID, { opacity: 25 }),
    ).rejects.toThrow(MediaAccessDeniedError);
    await expect(backgrounds.resetForPost(VISITOR, POST_ID)).rejects.toThrow(
      MediaAccessDeniedError,
    );
    await expect(backgrounds.listMediaIdsInUse(VISITOR)).rejects.toThrow(
      MediaAccessDeniedError,
    );
  });

  it("stores a live image and resolves its delivery URLs", async () => {
    await insertMedia(MEDIA_ID);
    const result = await service().updateDefault(OWNER, { mediaId: MEDIA_ID });

    expect(result).toEqual({
      ok: true,
      background: {
        opacity: 50,
        source: "default",
        image: {
          mediaId: MEDIA_ID,
          src: `/media/${MEDIA_ID}.jpg?w=1600`,
          srcSet: expect.stringContaining(`/media/${MEDIA_ID}.jpg?w=2400`),
          thumbnailUrl: `/media/${MEDIA_ID}.jpg?w=480`,
        },
      },
    });
  });

  it.each([10, "50", null, 150])("rejects tier %s", async (opacity) => {
    expect(await service().updateDefault(OWNER, { opacity })).toEqual({
      ok: false,
      reason: "invalid_opacity",
    });
  });

  it("rejects an unknown or deleted image", async () => {
    expect(
      await service().updateDefault(OWNER, { mediaId: "missing" }),
    ).toEqual({ ok: false, reason: "media_not_found" });

    await insertMedia(MEDIA_ID);
    await deleteMedia(MEDIA_ID);
    expect(await service().updateDefault(OWNER, { mediaId: MEDIA_ID })).toEqual(
      { ok: false, reason: "media_not_found" },
    );
  });

  it("falls back to no image once the stored image is deleted", async () => {
    await insertMedia(MEDIA_ID);
    await service().updateDefault(OWNER, { mediaId: MEDIA_ID, opacity: 75 });
    await deleteMedia(MEDIA_ID);

    expect(await service().getDefault(OWNER)).toEqual({
      opacity: 75,
      image: null,
      source: "default",
    });
  });
});

describe("editor background per post", () => {
  it("follows the default until the post has its own choice", async () => {
    await insertMedia(MEDIA_ID);
    await service().updateDefault(OWNER, { mediaId: MEDIA_ID, opacity: 75 });

    const view = await service().getForPost(OWNER, POST_ID);
    expect(view.source).toBe("default");
    expect(view.opacity).toBe(75);
    expect(view.image?.mediaId).toBe(MEDIA_ID);
  });

  it("starts a post's choice from the default and keeps it apart", async () => {
    await insertMedia(MEDIA_ID);
    await service().updateDefault(OWNER, { mediaId: MEDIA_ID, opacity: 75 });

    const result = await service().updateForPost(OWNER, POST_ID, {
      opacity: 25,
    });
    expect(result.ok && result.background).toMatchObject({
      source: "post",
      opacity: 25,
      image: { mediaId: MEDIA_ID },
    });

    // The default and other posts are unaffected.
    expect((await service().getDefault(OWNER)).opacity).toBe(75);
    expect((await service().getForPost(OWNER, OTHER_POST_ID)).opacity).toBe(75);
  });

  it("wins over later default changes", async () => {
    await insertMedia(MEDIA_ID);
    await insertMedia(OTHER_MEDIA_ID);
    await service().updateForPost(OWNER, POST_ID, { mediaId: MEDIA_ID });
    await service().updateDefault(OWNER, {
      mediaId: OTHER_MEDIA_ID,
      opacity: 100,
    });

    const view = await service().getForPost(OWNER, POST_ID);
    expect(view).toMatchObject({
      source: "post",
      opacity: 50,
      image: { mediaId: MEDIA_ID },
    });
  });

  it("resets a post to the default", async () => {
    await insertMedia(MEDIA_ID);
    await service().updateForPost(OWNER, POST_ID, {
      mediaId: MEDIA_ID,
      opacity: 100,
    });

    expect(await service().resetForPost(OWNER, POST_ID)).toEqual({
      opacity: 50,
      image: null,
      source: "default",
    });
    expect((await service().getForPost(OWNER, POST_ID)).source).toBe("default");
  });

  it("stores an explicit Off or removal as the post's own choice", async () => {
    await insertMedia(MEDIA_ID);
    await service().updateDefault(OWNER, { mediaId: MEDIA_ID });
    await service().updateForPost(OWNER, POST_ID, { mediaId: null });

    expect(await service().getForPost(OWNER, POST_ID)).toEqual({
      opacity: 50,
      image: null,
      source: "post",
    });
  });

  it("reports an unknown post instead of creating a row", async () => {
    expect(
      await service().updateForPost(OWNER, "missing", { opacity: 25 }),
    ).toEqual({ ok: false, reason: "post_not_found" });
  });

  it("never changes the post's version token", async () => {
    const before = await postUpdatedAt(POST_ID);
    await service().updateForPost(OWNER, POST_ID, { opacity: 100 });
    await service().resetForPost(OWNER, POST_ID);

    expect(await postUpdatedAt(POST_ID)).toBe(before);
  });

  it("lists every image in use, default and posts", async () => {
    await insertMedia(MEDIA_ID);
    await insertMedia(OTHER_MEDIA_ID);
    await service().updateDefault(OWNER, { mediaId: MEDIA_ID });
    await service().updateForPost(OWNER, POST_ID, { mediaId: OTHER_MEDIA_ID });
    await service().updateForPost(OWNER, OTHER_POST_ID, {
      mediaId: OTHER_MEDIA_ID,
    });

    expect([...(await service().listMediaIdsInUse(OWNER))].sort()).toEqual([
      MEDIA_ID,
      OTHER_MEDIA_ID,
    ]);
  });
});

describe("background table constraints", () => {
  it("rejects an off-scale opacity", async () => {
    await expect(
      db
        .prepare(
          "INSERT INTO editor_background (user_id, opacity) VALUES (?, 30)",
        )
        .bind(OWNER.user.id)
        .run(),
    ).rejects.toThrow(/CHECK constraint/);
    await expect(
      db
        .prepare(
          "INSERT INTO post_editor_background (post_id, opacity) VALUES (?, 30)",
        )
        .bind(POST_ID)
        .run(),
    ).rejects.toThrow(/CHECK constraint/);
  });

  it("rejects a row for an unknown user, post, or media id", async () => {
    await expect(
      db
        .prepare("INSERT INTO editor_background (user_id) VALUES ('nobody')")
        .run(),
    ).rejects.toThrow(/FOREIGN KEY/);
    await expect(
      db
        .prepare(
          "INSERT INTO post_editor_background (post_id, opacity) VALUES ('nobody', 50)",
        )
        .run(),
    ).rejects.toThrow(/FOREIGN KEY/);
    await expect(
      db
        .prepare(
          "INSERT INTO post_editor_background (post_id, media_id, opacity) VALUES (?, 'missing', 50)",
        )
        .bind(POST_ID)
        .run(),
    ).rejects.toThrow(/FOREIGN KEY/);
  });
});
