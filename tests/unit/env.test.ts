import { describe, expect, it } from "vitest";

import {
  parseAuthEnvironment,
  parseDatabaseEnvironment,
  parseEnvironment,
  parseOwnerEnvironment,
  parseR2Environment,
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

describe("parseR2Environment", () => {
  const validEnvironment = {
    R2_ACCOUNT_ID: "0123456789abcdef0123456789abcdef",
    R2_ACCESS_KEY_ID: "r2-access-key-id",
    R2_SECRET_ACCESS_KEY: "r2-secret-access-key-with-32-characters",
    R2_BUCKET_NAME: "blog-issue-4-spike",
    R2_PUBLIC_BASE_URL: "https://media-spike.fangmingluan.com",
  };

  it("accepts the complete R2 environment", () => {
    expect(parseR2Environment(validEnvironment)).toEqual(validEnvironment);
  });

  it.each([
    { R2_ACCOUNT_ID: "not-an-account-id" },
    { R2_BUCKET_NAME: "Invalid_Bucket" },
    { R2_PUBLIC_BASE_URL: "http://media.example.com" },
  ])(
    "rejects invalid R2 configuration: $R2_ACCOUNT_ID$R2_BUCKET_NAME$R2_PUBLIC_BASE_URL",
    (override) => {
      expect(() =>
        parseR2Environment({
          ...validEnvironment,
          ...override,
        }),
      ).toThrow();
    },
  );
});
