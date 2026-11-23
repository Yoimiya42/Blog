import { beforeEach, describe, expect, it, vi } from "vitest";

const set = vi.fn();
vi.mock("next/headers", () => ({ cookies: async () => ({ set }) }));

import { FLASH_COOKIE, setFlash } from "@/lib/flash";

beforeEach(() => {
  set.mockReset();
});

describe("setFlash", () => {
  it("stores the message unencoded, leaving encoding to the serializer", async () => {
    await setFlash("Post deleted");

    // Encoding here as well made the toaster show "Post%20deleted".
    expect(set).toHaveBeenCalledWith(
      FLASH_COOKIE,
      "Post deleted",
      expect.objectContaining({ path: "/admin", maxAge: 30 }),
    );
  });
});
