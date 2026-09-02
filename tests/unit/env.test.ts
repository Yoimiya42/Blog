import { describe, expect, it } from "vitest";

import { parseDatabaseEnvironment, parseEnvironment } from "@/lib/env";

describe("parseEnvironment", () => {
  it("defaults to development", () => {
    expect(parseEnvironment({})).toEqual({
      NODE_ENV: "development",
    });
  });

  it.each(["development", "test", "production"] as const)(
    "accepts %s",
    (nodeEnvironment) => {
      expect(
        parseEnvironment({
          NODE_ENV: nodeEnvironment,
        }),
      ).toEqual({
        NODE_ENV: nodeEnvironment,
      });
    },
  );

  it("rejects an unsupported environment", () => {
    expect(() =>
      parseEnvironment({
        NODE_ENV: "staging",
      }),
    ).toThrow();
  });
});

describe("parseDatabaseEnvironment", () => {
  it("accepts a PostgreSQL connection string", () => {
    expect(
      parseDatabaseEnvironment({
        DATABASE_URL: "postgresql://user:password@example.com/blog",
      }),
    ).toEqual({
      DATABASE_URL: "postgresql://user:password@example.com/blog",
    });
  });

  it.each([
    undefined,
    "",
    "mysql://user:password@example.com/blog",
    "not-a-url",
  ])("rejects an invalid database URL: %s", (databaseUrl) => {
    expect(() =>
      parseDatabaseEnvironment({
        DATABASE_URL: databaseUrl,
      }),
    ).toThrow();
  });
});
