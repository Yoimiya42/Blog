import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { processServerImage } from "@/features/spike/image.server";

async function createOrientedJpeg() {
  return sharp({
    create: {
      width: 3000,
      height: 2000,
      channels: 3,
      background: "#c2410c",
    },
  })
    .jpeg({ quality: 90 })
    .withMetadata({ orientation: 6 })
    .withExifMerge({
      IFD3: {
        GPSLatitudeRef: "N",
        GPSLatitude: "51/1 30/1 0/1",
        GPSLongitudeRef: "W",
        GPSLongitude: "0/1 7/1 0/1",
      },
    })
    .toBuffer();
}

describe("processServerImage", () => {
  it("auto-orients, limits dimensions, and removes EXIF", async () => {
    const input = await createOrientedJpeg();
    await expect(sharp(input).metadata()).resolves.toMatchObject({
      orientation: 6,
      exif: expect.any(Uint8Array),
    });
    const output = await processServerImage(input, {
      longEdge: 1000,
      outputType: "image/webp",
      quality: 80,
    });
    const metadata = await sharp(output.body).metadata();

    expect(output).toMatchObject({
      contentType: "image/webp",
      height: 1000,
      width: 667,
    });
    expect(output.size).toBe(output.body.byteLength);
    expect(metadata).toMatchObject({
      format: "webp",
      height: 1000,
      width: 667,
    });
    expect(metadata.orientation).toBeUndefined();
    expect(metadata.exif).toBeUndefined();
  });

  it("can emit AVIF", async () => {
    const input = await createOrientedJpeg();
    const output = await processServerImage(input, {
      longEdge: 800,
      outputType: "image/avif",
    });

    expect(output).toMatchObject({
      contentType: "image/avif",
      height: 800,
      width: 533,
    });
    await expect(sharp(output.body).metadata()).resolves.toMatchObject({
      format: "heif",
    });
  });

  it("rejects content that only claims to be an image", async () => {
    await expect(
      processServerImage(new TextEncoder().encode("not-an-image")),
    ).rejects.toThrow("Unsupported image content.");
  });
});
