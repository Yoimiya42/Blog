import { describe, expect, it } from "vitest";

import {
  parseAuthEnvironment,
  parseDatabaseEnvironment,
  parseEnvironment,
  parseOwnerEnvironment,
} from "@/lib/env";

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

describe("parseOwnerEnvironment", () => {
  it("accepts an owner email", () => {
    expect(parseOwnerEnvironment({ OWNER_EMAIL: "owner@example.com" })).toEqual(
      { OWNER_EMAIL: "owner@example.com" },
    );
  });

  it("rejects an invalid owner email", () => {
    expect(() => parseOwnerEnvironment({ OWNER_EMAIL: "owner" })).toThrow();
  });
});

describe("parseAuthEnvironment", () => {
  const validEnvironment = {
    OWNER_EMAIL: "owner@example.com",
    BETTER_AUTH_SECRET: "a-secure-secret-with-at-least-32-characters",
    RESEND_API_KEY: "re_test_key",
    AUTH_EMAIL_FROM: "Blog <login@example.com>",
  };

  it("accepts the complete authentication environment", () => {
    expect(parseAuthEnvironment(validEnvironment)).toEqual(validEnvironment);
  });

  it("rejects a short authentication secret", () => {
    expect(() =>
      parseAuthEnvironment({
        ...validEnvironment,
        BETTER_AUTH_SECRET: "too-short",
      }),
    ).toThrow();
  });

  it("rejects a non-Resend API key", () => {
    expect(() =>
      parseAuthEnvironment({
        ...validEnvironment,
        RESEND_API_KEY: "invalid",
      }),
    ).toThrow();
  });
});
