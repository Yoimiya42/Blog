import { describe, expect, it } from "vitest";

import {
  buildOwnerSeedSql,
  normalizeOwnerEmail,
  resolveDatabase,
  resolveOwnerEmail,
} from "../../scripts/seed-owner.mjs";

describe("resolveOwnerEmail", () => {
  const fail = () => {
    throw new Error("must not read .env");
  };

  it("prefers --email", () => {
    expect(
      resolveOwnerEmail(
        ["--email", "a@example.com"],
        { OWNER_EMAIL: "b@example.com" },
        fail,
      ),
    ).toBe("a@example.com");
  });

  it("uses OWNER_EMAIL before reading .env", () => {
    expect(resolveOwnerEmail([], { OWNER_EMAIL: "b@example.com" }, fail)).toBe(
      "b@example.com",
    );
  });

  it("reads .env for a local seed", () => {
    const env: { OWNER_EMAIL?: string } = {};
    const email = resolveOwnerEmail([], env, () => {
      env.OWNER_EMAIL = "c@example.com";
    });
    expect(email).toBe("c@example.com");
  });

  // A local file must never choose the owner of a remote database.
  it("never reads .env for a remote seed", () => {
    expect(resolveOwnerEmail(["--remote"], {}, fail)).toBeUndefined();
  });
});

describe("resolveDatabase", () => {
  it("defaults to the DB binding", () => {
    expect(resolveDatabase(["--email", "owner@example.com"])).toBe("DB");
  });

  it("reads the binding after --database", () => {
    expect(resolveDatabase(["--database", "PREVIEW_DB", "--remote"])).toBe(
      "PREVIEW_DB",
    );
  });

  // Falling back to DB here would seed production by mistake.
  it.each([["--database"], ["--database", "--remote"], ["--database", "a b"]])(
    "rejects %j",
    (...argv) => {
      expect(() => resolveDatabase(argv)).toThrow();
    },
  );
});

describe("normalizeOwnerEmail", () => {
  it("trims and lowercases a valid address", () => {
    expect(normalizeOwnerEmail("  Owner@Example.COM ")).toBe(
      "owner@example.com",
    );
  });

  it.each([
    undefined,
    "",
    "owner",
    "owner@localhost",
    "o'wner@example.com",
    "owner@example.com; DROP TABLE user",
    "owner@example.com' OR '1'='1",
  ])("rejects %j", (input) => {
    expect(() => normalizeOwnerEmail(input)).toThrow();
  });
});

describe("buildOwnerSeedSql", () => {
  it("is deterministic for the same address", () => {
    expect(buildOwnerSeedSql("Owner@Example.com")).toBe(
      buildOwnerSeedSql("owner@example.com"),
    );
  });

  it("demotes other owners and upserts the owner by email", () => {
    const sql = buildOwnerSeedSql("owner@example.com");

    expect(sql).toContain(
      "WHERE role = 'OWNER' AND email <> 'owner@example.com'",
    );
    expect(sql).toContain("ON CONFLICT (email) DO UPDATE SET role = 'OWNER'");
    expect(sql).toMatch(/VALUES \('owner_[0-9a-f]{24}', 'Owner'/);
    expect(sql).not.toMatch(/DELETE|DROP/i);
  });
});
