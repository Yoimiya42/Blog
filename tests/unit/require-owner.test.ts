import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
const createRequestAuth = vi.fn();
const requestHeaders = vi.fn();

class NotFoundSignal extends Error {}

vi.mock("next/headers", () => ({ headers: () => requestHeaders() }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new NotFoundSignal();
  },
}));
vi.mock("@/features/auth/server/request-auth", () => ({
  createRequestAuth: (origin: string) => createRequestAuth(origin),
}));

import { requireOwner } from "@/features/auth/server/require-owner";

describe("requireOwner", () => {
  beforeEach(() => {
    requestHeaders.mockResolvedValue(new Headers({ host: "fangmingluan.com" }));
    createRequestAuth.mockResolvedValue({ api: { getSession } });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("returns the session for the owner", async () => {
    const session = { user: { role: "OWNER" } };
    getSession.mockResolvedValue(session);

    await expect(requireOwner()).resolves.toBe(session);
    expect(createRequestAuth).toHaveBeenCalledWith("https://fangmingluan.com");
  });

  it("responds 404 without a session", async () => {
    getSession.mockResolvedValue(null);

    await expect(requireOwner()).rejects.toBeInstanceOf(NotFoundSignal);
  });

  it("responds 404 for a signed-in visitor", async () => {
    getSession.mockResolvedValue({ user: { role: "VISITOR" } });

    await expect(requireOwner()).rejects.toBeInstanceOf(NotFoundSignal);
  });

  it("fails closed when the session lookup throws", async () => {
    getSession.mockRejectedValue(new Error("database unavailable"));

    await expect(requireOwner()).rejects.toBeInstanceOf(NotFoundSignal);
  });

  it("fails closed when the request has no host", async () => {
    requestHeaders.mockResolvedValue(new Headers());

    await expect(requireOwner()).rejects.toBeInstanceOf(NotFoundSignal);
    expect(createRequestAuth).not.toHaveBeenCalled();
  });
});
