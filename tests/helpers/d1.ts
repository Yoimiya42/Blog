import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { getPlatformProxy } from "wrangler";

const MIGRATIONS_DIRECTORY = join(process.cwd(), "migrations");

export function listMigrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIRECTORY)
    .filter((name) => name.endsWith(".sql"))
    .sort();
}

/**
 * Splits a migration into statements. Sufficient while migrations contain no
 * triggers and no string literal with `--` or `;`; a migration that needs
 * either must extend this helper.
 */
export function splitStatements(sql: string): string[] {
  return sql
    .replace(/--.*$/gm, "")
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

export interface TestDatabase {
  db: D1Database;
  dispose(): Promise<void>;
}

const TEST_CONFIG = join(process.cwd(), "tests", "wrangler.test.jsonc");

/** An empty in-memory D1 database served by the local Workers runtime. */
export async function createEmptyDatabase(): Promise<TestDatabase> {
  const proxy = await getPlatformProxy<{ DB: D1Database }>({
    configPath: TEST_CONFIG,
    persist: false,
    remoteBindings: false,
  });

  return { db: proxy.env.DB, dispose: () => proxy.dispose() };
}

/** Applies each migration as one atomic batch, in filename order. */
export async function applyMigrations(db: D1Database): Promise<void> {
  for (const file of listMigrationFiles()) {
    const sql = readFileSync(join(MIGRATIONS_DIRECTORY, file), "utf8");
    await db.batch(
      splitStatements(sql).map((statement) => db.prepare(statement)),
    );
  }
}

export async function createMigratedDatabase(): Promise<TestDatabase> {
  const database = await createEmptyDatabase();
  await applyMigrations(database.db);

  return database;
}

export async function clearContentTables(db: D1Database): Promise<void> {
  await db.batch([
    db.prepare("DELETE FROM post_tag"),
    db.prepare("DELETE FROM post"),
    db.prepare("DELETE FROM tag"),
    db.prepare("DELETE FROM media"),
  ]);
}

export const SAMPLE_DOCUMENT = {
  type: "doc",
  content: [
    { type: "paragraph", content: [{ type: "text", text: "Hello, world." }] },
  ],
} as const;
