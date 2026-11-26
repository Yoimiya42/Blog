import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { isOwnerSession } from "@/features/auth/server/owner";
import {
  createCategoryRepository,
  createCategoryService,
  parseCategoryName,
  type CategoryService,
} from "@/features/category";

import {
  clearContentTables,
  createMigratedDatabase,
  type TestDatabase,
} from "../helpers/d1";

const OWNER = { user: { role: "OWNER" } };
const VISITOR = { user: { role: "VISITOR" } };

let database: TestDatabase;
let db: D1Database;
let service: CategoryService;
let nextId: number;

async function create(name: string): Promise<string> {
  const result = await service.create(OWNER, name);
  if (!result.ok) throw new Error(result.message);

  return result.category.id;
}

async function insertPost(id: string, categoryId: string, deleted = false) {
  await db
    .prepare(
      `INSERT INTO post (id, slug, title, content, category_id, deleted_at)
       VALUES (?, ?, 'Title', '{}', ?, ?)`,
    )
    .bind(id, id, categoryId, deleted ? 1 : null)
    .run();
}

beforeAll(async () => {
  database = await createMigratedDatabase();
  db = database.db;
  service = createCategoryService({
    categories: createCategoryRepository(db),
    isOwner: isOwnerSession,
    newId: () => `cat-${++nextId}`,
  });
}, 30_000);

afterAll(async () => {
  await database.dispose();
});

beforeEach(async () => {
  await clearContentTables(db);
  nextId = 0;
});

describe("category names (FR-ADMIN-30)", () => {
  it("trims names and rejects blank or long ones", () => {
    expect(parseCategoryName("  Economy   notes ")).toEqual({
      ok: true,
      name: "Economy notes",
    });
    expect(parseCategoryName("   ")).toMatchObject({ ok: false });
    expect(parseCategoryName("x".repeat(21))).toMatchObject({ ok: false });
    expect(parseCategoryName(42)).toMatchObject({ ok: false });
  });
});

describe("category service (FR-ADMIN-30)", () => {
  it("is owner-only", async () => {
    await expect(service.list(VISITOR)).rejects.toThrow(/owner/);
    await expect(service.create(null, "A")).rejects.toThrow(/owner/);
  });

  it("creates, renames, and lists in creation order with usage", async () => {
    const a = await create("Alpha");
    const b = await create("Beta");
    await insertPost("p1", a);
    await insertPost("p2", a, true);

    expect(await service.rename(OWNER, b, "Gamma")).toEqual({
      ok: true,
      category: { id: b, name: "Gamma" },
    });
    expect(await service.list(OWNER)).toEqual([
      { id: a, name: "Alpha", posts: 1 },
      { id: b, name: "Gamma", posts: 0 },
    ]);
  });

  it("refuses a name already used, ignoring case", async () => {
    const a = await create("Alpha");
    const b = await create("Beta");

    expect(await service.create(OWNER, "alpha")).toEqual({
      ok: false,
      message: "Another category already has this name.",
    });
    expect(await service.rename(OWNER, b, "ALPHA")).toEqual({
      ok: false,
      message: "Another category already has this name.",
    });
    // Renaming to its own name in another case is allowed.
    expect(await service.rename(OWNER, a, "ALPHA")).toMatchObject({ ok: true });
  });

  it("deletes only a category without live posts", async () => {
    const used = await create("Used");
    const old = await create("Old");
    await insertPost("p1", used);
    await insertPost("p2", old, true);

    expect(await service.remove(OWNER, used)).toEqual({
      ok: false,
      message: "1 post uses this category. Move it to another category first.",
    });
    // A soft-deleted post lets go of its category.
    expect(await service.remove(OWNER, old)).toEqual({ ok: true });
    expect(await service.remove(OWNER, old)).toEqual({
      ok: false,
      message: "This category no longer exists.",
    });
    expect(await service.rename(OWNER, old, "Back")).toEqual({
      ok: false,
      message: "This category no longer exists.",
    });
  });
});
