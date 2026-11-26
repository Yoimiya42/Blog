import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { MomentAccessDeniedError } from "@/features/moment";
import { createMomentRepository } from "@/features/moment/server/moment.repository";
import {
  createMomentService,
  momentTitle,
  type MomentService,
} from "@/features/moment/server/moment.service";

import {
  clearContentTables,
  createMigratedDatabase,
  type TestDatabase,
} from "../helpers/d1";

let database: TestDatabase;
let db: D1Database;

const OWNER = { user: { role: "OWNER" } };
const VISITOR = { user: { role: "USER" } };
const NOW = new Date("2026-11-25T08:00:00.000Z");

/** Media ids the fake media module treats as live. */
let live: Set<string>;

function image(id: string) {
  return {
    url: `/media/${id}.jpg?w=960`,
    srcSet: `/media/${id}.jpg?w=480 480w`,
    zoomUrl: `/media/${id}.jpg?w=1600`,
    width: 1200,
    height: 800,
    alt: "",
  };
}

function service(): MomentService {
  let sequence = 0;
  let clock = NOW.getTime();

  return createMomentService({
    moments: createMomentRepository(db),
    isOwner: (actor) => actor?.user.role === "OWNER",
    findLiveMedia: async (ids) => new Set(ids.filter((id) => live.has(id))),
    resolveImages: async (ids) =>
      Object.fromEntries(
        ids.filter((id) => live.has(id)).map((id) => [id, image(id)]),
      ),
    // Each write is one second later, so list order is deterministic.
    now: () => new Date((clock += 1000)),
    newId: () => `moment-${++sequence}`,
  });
}

async function insertMedia(...ids: string[]) {
  for (const id of ids) {
    await db
      .prepare(
        `INSERT INTO media (id, storage_key, mime_type, width, height, size_bytes)
         VALUES (?, ?, 'image/jpeg', 1200, 800, 1000)`,
      )
      .bind(id, `media/${id}.jpg`)
      .run();
    live.add(id);
  }
}

beforeAll(async () => {
  database = await createMigratedDatabase();
  db = database.db;
}, 30_000);

afterAll(async () => {
  await database.dispose();
});

beforeEach(async () => {
  await clearContentTables(db);
  live = new Set();
});

describe("moment service", () => {
  it("refuses every owner method to a visitor", async () => {
    const moments = service();
    const input = { body: "Hi", mediaIds: [] };

    await expect(moments.create(VISITOR, input)).rejects.toThrow(
      MomentAccessDeniedError,
    );
    await expect(moments.create(null, input)).rejects.toThrow(
      MomentAccessDeniedError,
    );
    await expect(moments.update(VISITOR, "x", input, NOW)).rejects.toThrow(
      MomentAccessDeniedError,
    );
    await expect(moments.remove(VISITOR, "x")).rejects.toThrow(
      MomentAccessDeniedError,
    );
    await expect(moments.listForOwner(VISITOR, 1)).rejects.toThrow(
      MomentAccessDeniedError,
    );
  });

  it("trims the body and normalises line endings", async () => {
    const result = await service().create(OWNER, {
      body: "  Line one\r\nLine two \n",
      mediaIds: [],
    });

    expect(result).toMatchObject({
      ok: true,
      moment: { body: "Line one\nLine two", mediaIds: [] },
    });
  });

  it("accepts images without text", async () => {
    await insertMedia("m-a");

    const result = await service().create(OWNER, {
      body: "   ",
      mediaIds: ["m-a"],
    });

    expect(result).toMatchObject({ ok: true, moment: { body: "" } });
  });

  it.each([
    ["an empty moment", { body: " ", mediaIds: [] }, "body"],
    ["a missing body", { body: undefined, mediaIds: [] }, "body"],
    ["a non-array image list", { body: "Hi", mediaIds: "m-a" }, "mediaIds"],
    ["duplicate images", { body: "Hi", mediaIds: ["a", "a"] }, "mediaIds"],
    [
      "ten images",
      { body: "Hi", mediaIds: Array.from({ length: 10 }, (_, i) => `m${i}`) },
      "mediaIds",
    ],
  ])("rejects %s", async (_name, input, field) => {
    const result = await service().create(OWNER, input);

    expect(result).toMatchObject({
      ok: false,
      reason: "invalid",
      fieldErrors: { [field]: expect.any(String) },
    });
  });

  it("counts characters as code points, like SQLite", async () => {
    const moments = service();
    // 2,000 emoji are 4,000 UTF-16 units but 2,000 characters.
    const atLimit = "😀".repeat(2000);

    expect(
      await moments.create(OWNER, { body: atLimit, mediaIds: [] }),
    ).toMatchObject({ ok: true });
    expect(
      await moments.create(OWNER, { body: `${atLimit}x`, mediaIds: [] }),
    ).toMatchObject({ ok: false, fieldErrors: { body: expect.any(String) } });
  });

  it("rejects a deleted image", async () => {
    await insertMedia("m-a");
    live.delete("m-a");

    const result = await service().create(OWNER, {
      body: "Hi",
      mediaIds: ["m-a"],
    });

    expect(result).toMatchObject({
      ok: false,
      fieldErrors: { mediaIds: expect.any(String) },
    });
  });

  it("updates under the version token and reports conflicts", async () => {
    const moments = service();
    const created = await moments.create(OWNER, { body: "A", mediaIds: [] });
    if (!created.ok) throw new Error("create failed");

    const updated = await moments.update(
      OWNER,
      created.moment.id,
      { body: "B", mediaIds: [] },
      created.moment.updatedAt,
    );
    expect(updated).toMatchObject({ ok: true, moment: { body: "B" } });

    expect(
      await moments.update(
        OWNER,
        created.moment.id,
        { body: "C", mediaIds: [] },
        created.moment.updatedAt,
      ),
    ).toEqual({ ok: false, reason: "conflict" });
    expect(
      await moments.update(OWNER, "missing", { body: "C", mediaIds: [] }, NOW),
    ).toEqual({ ok: false, reason: "not_found" });
  });

  it("lists a public page with live images in order", async () => {
    await insertMedia("m-a", "m-b");
    const moments = service();
    await moments.create(OWNER, { body: "Older", mediaIds: [] });
    await moments.create(OWNER, { body: "Newer", mediaIds: ["m-b", "m-a"] });
    live.delete("m-b");

    const page = await moments.listPage(1);

    expect(page).toMatchObject({ page: 1, totalPages: 1, total: 2 });
    expect(page?.moments.map((moment) => moment.body)).toEqual([
      "Newer",
      "Older",
    ]);
    expect(page?.moments[0]?.images).toEqual([{ id: "m-a", ...image("m-a") }]);
  });

  it("returns null outside the feed but always serves page 1", async () => {
    const moments = service();

    expect(await moments.listPage(1)).toMatchObject({
      moments: [],
      totalPages: 1,
    });
    expect(await moments.listPage(2)).toBeNull();
    expect(await moments.listPage(Number.NaN)).toBeNull();
    expect(await moments.listPage(0)).toBeNull();
  });

  it("hides a deleted moment from the feed", async () => {
    const moments = service();
    const created = await moments.create(OWNER, { body: "A", mediaIds: [] });
    if (!created.ok) throw new Error("create failed");

    expect(await moments.remove(OWNER, created.moment.id)).toBe(true);
    expect(await moments.remove(OWNER, created.moment.id)).toBe(false);
    expect((await moments.listPage(1))?.moments).toEqual([]);
    expect(await moments.get(OWNER, created.moment.id)).toBeNull();
  });

  it("names referencing moments for the media library", async () => {
    await insertMedia("m-a");
    const moments = service();
    const created = await moments.create(OWNER, {
      body: "",
      mediaIds: ["m-a"],
    });
    if (!created.ok) throw new Error("create failed");

    expect(await moments.findReferencingMedia("m-a")).toEqual([
      {
        id: created.moment.id,
        title: `Moment of ${created.moment.createdAt.toISOString().slice(0, 10)}`,
        href: `/admin/moments/${created.moment.id}`,
      },
    ]);
  });
});

describe("momentTitle", () => {
  it("uses the first line, shortened to 40 characters", () => {
    expect(momentTitle({ body: "Short\nsecond line", createdAt: NOW })).toBe(
      "Short",
    );
    expect(momentTitle({ body: "a".repeat(41), createdAt: NOW })).toBe(
      `${"a".repeat(40)}…`,
    );
    expect(momentTitle({ body: "", createdAt: NOW })).toBe(
      "Moment of 2026-11-25",
    );
  });
});
