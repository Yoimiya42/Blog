import { describe, expect, it } from "vitest";

import {
  buildOwnerSeedSql,
  normalizeOwnerEmail,
} from "../../scripts/seed-owner.mjs";

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
