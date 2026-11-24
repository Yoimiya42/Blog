import { beforeEach, describe, expect, it, vi } from "vitest";

const readOwnerSession = vi.fn();
const upload = vi.fn();

vi.mock("@/features/auth", () => ({
  readOwnerSession: (headers: Headers) => readOwnerSession(headers),
}));
vi.mock("@/features/media/server/media.service", () => ({
  ARTICLE_IMAGE_WIDTH: 1600,
  getMediaService: async () => ({ upload }),
}));

import { MediaRejectedError } from "@/features/media/upload/errors";
import { MAX_UPLOAD_BYTES } from "@/features/media/upload/process";
import { uploadMedia } from "@/features/media/server/upload-media";

const ORIGIN = "https://fangmingluan.com";
const OWNER = { user: { role: "OWNER" } };

function request(
  body: Uint8Array | null,
  headers: Record<string, string> = {},
): Request {
  return new Request(`${ORIGIN}/api/media`, {
    method: "POST",
    body: body as BodyInit | null,
    headers: {
      origin: ORIGIN,
      ...(body ? { "content-length": String(body.length) } : {}),
      ...headers,
    },
  });
}

async function errorOf(response: Response) {
  return ((await response.json()) as { error: string }).error;
}

describe("uploadMedia", () => {
  beforeEach(() => {
    readOwnerSession.mockResolvedValue(OWNER);
    upload.mockResolvedValue({
      id: "abcdefghij0123456789",
      storageKey: "media/abcdefghij0123456789.jpg",
      width: 640,
      height: 480,
      alt: "Harbour",
    });
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("refuses a missing or foreign origin before checking the session", async () => {
    const foreign = await uploadMedia(
      request(new Uint8Array([1]), { origin: "https://evil.example" }),
    );
    const missing = new Request(`${ORIGIN}/api/media`, {
      method: "POST",
      body: new Uint8Array([1]) as BodyInit,
    });

    expect(foreign.status).toBe(403);
    expect((await uploadMedia(missing)).status).toBe(403);
    expect(readOwnerSession).not.toHaveBeenCalled();
  });

  it("answers 404 to a non-owner without reading the body", async () => {
    readOwnerSession.mockResolvedValue(null);
    const body = new Uint8Array([1, 2, 3]);
    const req = request(body);

    const response = await uploadMedia(req);

    expect(response.status).toBe(404);
    expect(req.bodyUsed).toBe(false);
    expect(upload).not.toHaveBeenCalled();
  });

  it("requires a declared length within the limit", async () => {
    const chunked = request(new Uint8Array([1]));
    chunked.headers.delete("content-length");
    expect((await uploadMedia(chunked)).status).toBe(411);

    const oversized = request(new Uint8Array([1]), {
      "content-length": String(MAX_UPLOAD_BYTES + 1),
    });
    const response = await uploadMedia(oversized);
    expect(response.status).toBe(413);
    expect(oversized.bodyUsed).toBe(false);
  });

  it("refuses a body longer than declared", async () => {
    const response = await uploadMedia(
      request(new Uint8Array(10), { "content-length": "4" }),
    );

    expect(response.status).toBe(400);
    expect(upload).not.toHaveBeenCalled();
  });

  it("passes the raw bytes and decoded alt text to the service", async () => {
    const body = new Uint8Array([0xff, 0xd8, 0xff, 0x00]);

    const response = await uploadMedia(
      request(body, { "x-media-alt": encodeURIComponent("港口 at dusk") }),
    );

    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      id: "abcdefghij0123456789",
      url: "/media/abcdefghij0123456789.jpg?w=1600",
      width: 640,
      height: 480,
      alt: "Harbour",
    });
    const [actor, bytes, alt] = upload.mock.calls[0]!;
    expect(actor).toBe(OWNER);
    expect([...(bytes as Uint8Array)]).toEqual([...body]);
    expect(alt).toBe("港口 at dusk");
  });

  it("reports a rejected file as 422 with its message", async () => {
    upload.mockRejectedValue(new MediaRejectedError("heic_unsupported"));

    const response = await uploadMedia(request(new Uint8Array([1])));

    expect(response.status).toBe(422);
    expect(await errorOf(response)).toMatch(/HEIC not supported/);
  });

  it("hides unexpected failures behind a generic 500", async () => {
    upload.mockRejectedValue(new Error("D1 unavailable"));

    const response = await uploadMedia(request(new Uint8Array([1])));

    expect(response.status).toBe(500);
    expect(await errorOf(response)).not.toMatch(/D1/);
  });
});
