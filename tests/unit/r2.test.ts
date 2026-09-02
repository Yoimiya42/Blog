import { afterEach, describe, expect, it, vi } from "vitest";

import { createR2StorageAdapter, type R2RequestClient } from "@/lib/storage/r2";

const adapterOptions = {
  accessKeyId: "r2-access-key-id",
  accountId: "0123456789abcdef0123456789abcdef",
  bucketName: "blog-issue-4-spike",
  publicBaseUrl: "https://media-spike.fangmingluan.com/",
  secretAccessKey: "r2-secret-access-key-with-32-characters",
};

function createClient(
  response: Response = new Response(null, { status: 200 }),
) {
  const fetch = vi.fn(async () => response);
  const sign = vi.fn(
    async (input: Request | URL | string, init?: RequestInit) => {
      const url = new URL(input.toString());
      url.searchParams.set("X-Amz-Signature", "test-signature");
      return new Request(url, { method: init?.method });
    },
  );

  return {
    client: {
      fetch: fetch as R2RequestClient["fetch"],
      sign: sign as R2RequestClient["sign"],
    },
    fetch,
    sign,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("createR2StorageAdapter", () => {
  it("uploads a buffered object and returns its public URL", async () => {
    const { client, fetch } = createClient(
      new Response(null, {
        status: 200,
        headers: { etag: '"test-etag"' },
      }),
    );
    const adapter = createR2StorageAdapter(adapterOptions, client);

    await expect(
      adapter.upload({
        body: new Uint8Array([1, 2, 3]),
        contentType: "image/jpeg",
        key: "images/example image.jpg",
      }),
    ).resolves.toEqual({
      etag: '"test-etag"',
      key: "images/example image.jpg",
      size: 3,
      url: "https://media-spike.fangmingluan.com/images/example%20image.jpg",
    });

    expect(fetch).toHaveBeenCalledWith(
      "https://0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com/blog-issue-4-spike/images/example%20image.jpg",
      expect.objectContaining({
        method: "PUT",
        headers: { "Content-Type": "image/jpeg" },
      }),
    );
  });

  it.each(["", "/image.jpg", "images//image.jpg", "../image.jpg"])(
    "rejects an unsafe key: %s",
    async (key) => {
      const { client, fetch } = createClient();
      const adapter = createR2StorageAdapter(adapterOptions, client);

      await expect(adapter.head(key)).rejects.toThrow("Invalid storage key.");
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it("returns null when object metadata is missing", async () => {
    const { client } = createClient(new Response(null, { status: 404 }));
    const adapter = createR2StorageAdapter(adapterOptions, client);

    await expect(adapter.head("images/missing.jpg")).resolves.toBeNull();
  });

  it("downloads bytes and object metadata", async () => {
    const { client } = createClient(
      new Response(new Uint8Array([4, 5, 6]), {
        status: 200,
        headers: {
          "content-length": "3",
          "content-type": "image/webp",
          etag: '"download-etag"',
        },
      }),
    );
    const adapter = createR2StorageAdapter(adapterOptions, client);

    const result = await adapter.download("images/example.webp");

    expect(result).toMatchObject({
      contentType: "image/webp",
      etag: '"download-etag"',
      key: "images/example.webp",
      size: 3,
    });
    expect(result.body).toEqual(new Uint8Array([4, 5, 6]));
  });

  it("creates an expiring signed download URL", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-02T12:00:00.000Z"));
    const { client, sign } = createClient();
    const adapter = createR2StorageAdapter(adapterOptions, client);

    await expect(
      adapter.getSignedUrl("images/private.jpg", 300),
    ).resolves.toEqual({
      expiresAt: "2026-09-02T12:05:00.000Z",
      url: expect.stringContaining("X-Amz-Signature=test-signature"),
    });
    expect(sign).toHaveBeenCalledWith(
      expect.objectContaining({
        search: "?X-Amz-Expires=300",
      }),
      {
        method: "GET",
        headers: undefined,
        aws: { allHeaders: true, signQuery: true },
      },
    );
  });

  it("signs uploads with their content type", async () => {
    const { client, sign } = createClient();
    const adapter = createR2StorageAdapter(adapterOptions, client);

    await adapter.createSignedUpload({
      contentType: "image/avif",
      expiresInSeconds: 60,
      key: "images/example.avif",
    });

    expect(sign).toHaveBeenCalledWith(expect.any(URL), {
      method: "PUT",
      headers: { "Content-Type": "image/avif" },
      aws: { allHeaders: true, signQuery: true },
    });
  });

  it("rejects signed URLs longer than the R2 maximum", async () => {
    const { client, sign } = createClient();
    const adapter = createR2StorageAdapter(adapterOptions, client);

    await expect(
      adapter.getSignedUrl("images/example.jpg", 604801),
    ).rejects.toThrow("between 1 and 604800 seconds");
    expect(sign).not.toHaveBeenCalled();
  });

  it("does not expose an R2 response body in errors", async () => {
    const { client } = createClient(
      new Response("sensitive upstream details", { status: 403 }),
    );
    const adapter = createR2StorageAdapter(adapterOptions, client);

    await expect(adapter.delete("images/example.jpg")).rejects.toThrow(
      "R2 delete failed with status 403.",
    );
  });
});
