import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  createMomentRepository,
  type MomentRepository,
} from "@/features/moment/server/moment.repository";

import {
  clearContentTables,
  createMigratedDatabase,
  type TestDatabase,
} from "../helpers/d1";

let database: TestDatabase;
let db: D1Database;
let moments: MomentRepository;

const CREATED = new Date("2026-11-25T08:00:00.000Z");
const LATER = new Date("2026-11-25T09:30:00.000Z");

async function insertMedia(...ids: string[]) {
  for (const id of ids) {
    await db
      .prepare(
        `INSERT INTO media (id, storage_key, mime_type, width, height, size_bytes)
         VALUES (?, ?, 'image/jpeg', 1200, 800, 1000)`,
      )
      .bind(id, `media/${id}.jpg`)
      .run();
  }
}

beforeAll(async () => {
  database = await createMigratedDatabase();
  db = database.db;
  moments = createMomentRepository(db);
}, 30_000);

afterAll(async () => {
  await database.dispose();
});

beforeEach(async () => {
  await clearContentTables(db);
});

describe("moment repository", () => {
  it("stores a moment with its images in order", async () => {
    await insertMedia("m-a", "m-b", "m-c");

    const created = await moments.insert(
      { id: "one", body: "Hello", mediaIds: ["m-c", "m-a", "m-b"] },
      CREATED,
    );

    expect(created).toEqual({
      id: "one",
      body: "Hello",
      mediaIds: ["m-c", "m-a", "m-b"],
      createdAt: CREATED,
      updatedAt: CREATED,
    });
    expect(await moments.findById("one")).toEqual(created);
  });

  it("stores a text-only moment with an empty image list", async () => {
    const created = await moments.insert(
      { id: "one", body: "Text", mediaIds: [] },
      CREATED,
    );

    expect(created.mediaIds).toEqual([]);
  });

  it("rolls back the moment when an image is unknown", async () => {
    await expect(
      moments.insert(
        { id: "one", body: "Hello", mediaIds: ["missing"] },
        CREATED,
      ),
    ).rejects.toThrow(/FOREIGN KEY/);
    expect(await moments.findById("one")).toBeNull();
  });

  it("rejects a body over 2,000 characters in the database", async () => {
    await expect(
      moments.insert(
        { id: "one", body: "x".repeat(2001), mediaIds: [] },
        CREATED,
      ),
    ).rejects.toThrow(/CHECK constraint/);
  });

  it("replaces body and images under the version token", async () => {
    await insertMedia("m-a", "m-b");
    await moments.insert(
      { id: "one", body: "Before", mediaIds: ["m-a"] },
      CREATED,
    );

    const updated = await moments.update(
      "one",
      { body: "After", mediaIds: ["m-b", "m-a"] },
      LATER,
      CREATED,
    );

    expect(updated).toMatchObject({
      body: "After",
      mediaIds: ["m-b", "m-a"],
      createdAt: CREATED,
      updatedAt: LATER,
    });
  });

  it("changes nothing when the version token is stale", async () => {
    await insertMedia("m-a", "m-b");
    await moments.insert(
      { id: "one", body: "Before", mediaIds: ["m-a"] },
      CREATED,
    );

    expect(
      await moments.update(
        "one",
        { body: "After", mediaIds: ["m-b"] },
        LATER,
        new Date(CREATED.getTime() - 1),
      ),
    ).toBeNull();
    expect(await moments.findById("one")).toMatchObject({
      body: "Before",
      mediaIds: ["m-a"],
      updatedAt: CREATED,
    });
  });

  it("increases the token even within one millisecond", async () => {
    await moments.insert({ id: "one", body: "A", mediaIds: [] }, CREATED);

    const updated = await moments.update(
      "one",
      { body: "B", mediaIds: [] },
      CREATED,
      CREATED,
    );

    expect(updated?.updatedAt.getTime()).toBe(CREATED.getTime() + 1);
  });

  it("lists live moments newest first with pages and a count", async () => {
    for (const [index, id] of ["a", "b", "c"].entries()) {
      await moments.insert(
        { id, body: id, mediaIds: [] },
        new Date(CREATED.getTime() + index * 1000),
      );
    }
    await moments.softDelete("b", LATER);

    expect((await moments.list(10, 0)).map((moment) => moment.id)).toEqual([
      "c",
      "a",
    ]);
    expect((await moments.list(1, 1)).map((moment) => moment.id)).toEqual([
      "a",
    ]);
    expect(await moments.count()).toBe(2);
  });

  it("soft-deletes once and hides the moment", async () => {
    await moments.insert({ id: "one", body: "A", mediaIds: [] }, CREATED);

    expect(await moments.softDelete("one", LATER)).toBe(true);
    expect(await moments.softDelete("one", LATER)).toBe(false);
    expect(await moments.findById("one")).toBeNull();
    expect(
      await moments.update("one", { body: "B", mediaIds: [] }, LATER, LATER),
    ).toBeNull();
  });

  it("finds live moments that show an image", async () => {
    await insertMedia("m-a", "m-b");
    await moments.insert(
      { id: "one", body: "First", mediaIds: ["m-a"] },
      CREATED,
    );
    await moments.insert(
      { id: "two", body: "Second", mediaIds: ["m-b", "m-a"] },
      LATER,
    );
    await moments.insert(
      { id: "gone", body: "Gone", mediaIds: ["m-a"] },
      LATER,
    );
    await moments.softDelete("gone", LATER);

    expect(await moments.listReferencing("m-a")).toEqual([
      { id: "two", body: "Second", createdAt: LATER },
      { id: "one", body: "First", createdAt: CREATED },
    ]);
    expect(await moments.listReferencing("m-c")).toEqual([]);
  });
});
