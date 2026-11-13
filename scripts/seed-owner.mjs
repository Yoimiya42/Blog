#!/usr/bin/env node
// Provisions the single owner account in D1. Safe to rerun.
//
//   node scripts/seed-owner.mjs --email owner@example.com            (local D1)
//   node scripts/seed-owner.mjs --email owner@example.com --remote   (remote D1)
//
// Arguments after `--` are passed to `wrangler d1 execute`, e.g. `-- --env production`.

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

const EMAIL_PATTERN = /^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)+$/;

export function normalizeOwnerEmail(input) {
  const email = String(input ?? "")
    .trim()
    .toLowerCase();

  // The pattern admits no quote, space, or semicolon, so the address is safe
  // to inline. `wrangler d1 execute` accepts no bound parameters.
  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    throw new Error("Provide a valid owner email address.");
  }

  return email;
}

export function buildOwnerSeedSql(input) {
  const email = normalizeOwnerEmail(input);
  // A stable id keeps repeated runs and separate databases consistent.
  const id = `owner_${createHash("sha256").update(email).digest("hex").slice(0, 24)}`;
  const now = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";

  return [
    // Exactly one owner: demote any other owner before promoting this address.
    `UPDATE user SET role = 'VISITOR', updated_at = ${now} WHERE role = 'OWNER' AND email <> '${email}';`,
    `INSERT INTO user (id, name, email, email_verified, role) VALUES ('${id}', 'Owner', '${email}', 1, 'OWNER') ON CONFLICT (email) DO UPDATE SET role = 'OWNER', email_verified = 1, updated_at = ${now};`,
  ].join("\n");
}

function main(argv) {
  const separator = argv.indexOf("--");
  const own = separator === -1 ? argv : argv.slice(0, separator);
  const passthrough = separator === -1 ? [] : argv.slice(separator + 1);

  const emailIndex = own.indexOf("--email");
  const email =
    emailIndex === -1 ? process.env.OWNER_EMAIL : own[emailIndex + 1];
  const target = own.includes("--remote") ? "--remote" : "--local";

  const sql = buildOwnerSeedSql(email);

  // Run Wrangler's entry file directly with a SQL file: no shell parses the
  // statement, so quoting behaves the same on every platform.
  const require = createRequire(import.meta.url);
  const manifestPath = require.resolve("wrangler/package.json");
  const { bin } = require(manifestPath);
  const entry = join(
    dirname(manifestPath),
    typeof bin === "string" ? bin : bin.wrangler,
  );

  const directory = mkdtempSync(join(tmpdir(), "seed-owner-"));
  const file = join(directory, "seed.sql");
  writeFileSync(file, sql);

  try {
    const result = spawnSync(
      process.execPath,
      [entry, "d1", "execute", "DB", target, "--file", file, ...passthrough],
      { stdio: "inherit" },
    );

    return result.status ?? 1;
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    process.exit(main(process.argv.slice(2)));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
