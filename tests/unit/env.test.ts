import { describe, expect, it } from "vitest";

import { parseEnvironment } from "@/lib/env";

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
