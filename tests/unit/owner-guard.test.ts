import { describe, expect, it } from "vitest";

import {
  isOwnerSession,
  originFromHeaders,
} from "@/features/auth/server/owner";

describe("isOwnerSession", () => {
  it("accepts only the OWNER role", () => {
    expect(isOwnerSession({ user: { role: "OWNER" } })).toBe(true);
    expect(isOwnerSession({ user: { role: "VISITOR" } })).toBe(false);
    expect(isOwnerSession({ user: { role: "owner" } })).toBe(false);
    expect(isOwnerSession({ user: {} })).toBe(false);
    expect(isOwnerSession(null)).toBe(false);
    expect(isOwnerSession(undefined)).toBe(false);
  });
});

describe("originFromHeaders", () => {
  it("uses https for public hosts and http for local hosts", () => {
    expect(originFromHeaders(new Headers({ host: "fangmingluan.com" }))).toBe(
      "https://fangmingluan.com",
    );
    expect(originFromHeaders(new Headers({ host: "localhost:3001" }))).toBe(
      "http://localhost:3001",
    );
    expect(originFromHeaders(new Headers({ host: "127.0.0.1:8787" }))).toBe(
      "http://127.0.0.1:8787",
    );
  });

  it("prefers a valid forwarded protocol and ignores other values", () => {
    expect(
      originFromHeaders(
        new Headers({ host: "localhost:3001", "x-forwarded-proto": "https" }),
      ),
    ).toBe("https://localhost:3001");
    expect(
      originFromHeaders(
        new Headers({
          host: "fangmingluan.com",
          "x-forwarded-proto": "javascript",
        }),
      ),
    ).toBe("https://fangmingluan.com");
  });

  it("returns undefined without a host", () => {
    expect(originFromHeaders(new Headers())).toBeUndefined();
  });
});
