// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  firstImageFile,
  uploadImage,
} from "@/features/post/content/upload-image";

const CONFIG = { path: "/api/media", altHeader: "X-Media-Alt", maxBytes: 100 };

function file(name: string, type: string, size = 10) {
  return new File([new Uint8Array(size)], name, { type });
}

function reply(status: number, body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json(body, { status })),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("firstImageFile", () => {
  it("skips files of other types", () => {
    const list = [file("a.txt", "text/plain"), file("b.png", "image/png")];

    expect(firstImageFile(list as unknown as FileList)?.name).toBe("b.png");
    expect(firstImageFile(null)).toBeNull();
  });
});

describe("uploadImage", () => {
  it("returns the media id and display URL", async () => {
    reply(201, { id: "abc", url: "/media/abc.jpg?w=1600", alt: "" });

    await expect(
      uploadImage(CONFIG, file("a.jpg", "image/jpeg"), ""),
    ).resolves.toEqual({
      ok: true,
      mediaId: "abc",
      url: "/media/abc.jpg?w=1600",
      alt: "",
    });
  });

  it("rejects a reply without a URL", async () => {
    reply(201, { id: "abc" });

    const result = await uploadImage(CONFIG, file("a.jpg", "image/jpeg"), "");
    expect(result.ok).toBe(false);
  });

  it("reports the server error message", async () => {
    reply(422, { error: "Location data could not be removed." });

    await expect(
      uploadImage(CONFIG, file("a.jpg", "image/jpeg"), ""),
    ).resolves.toEqual({
      ok: false,
      message: "Location data could not be removed.",
    });
  });

  it("refuses oversized and HEIC files without a request", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    expect(
      (await uploadImage(CONFIG, file("a.jpg", "image/jpeg", 101), "")).ok,
    ).toBe(false);
    expect((await uploadImage(CONFIG, file("a.heic", ""), "")).ok).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
});
