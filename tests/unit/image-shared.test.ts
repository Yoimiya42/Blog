import { describe, expect, it } from "vitest";

import {
  calculateOutputDimensions,
  containsExifMetadata,
  detectImageContentType,
  MAX_IMAGE_INPUT_BYTES,
  normalizeImageProcessingOptions,
  validateImageInput,
} from "@/features/spike/image.shared";

function ascii(value: string) {
  return Array.from(value, (character) => character.charCodeAt(0));
}

describe("detectImageContentType", () => {
  it.each([
    ["image/jpeg", new Uint8Array([0xff, 0xd8, 0xff, 0xe1])],
    [
      "image/png",
      new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ],
    [
      "image/webp",
      new Uint8Array([...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WEBP")]),
    ],
    [
      "image/heic",
      new Uint8Array([0, 0, 0, 24, ...ascii("ftyp"), ...ascii("heic")]),
    ],
    [
      "image/avif",
      new Uint8Array([0, 0, 0, 24, ...ascii("ftyp"), ...ascii("avif")]),
    ],
  ])("detects %s by file signature", (contentType, bytes) => {
    expect(detectImageContentType(bytes)).toBe(contentType);
  });

  it("rejects a MIME claim without a supported signature", () => {
    expect(
      detectImageContentType(new TextEncoder().encode("not-an-image")),
    ).toBeNull();
  });
});

describe("containsExifMetadata", () => {
  it("finds JPEG and WebP EXIF markers", () => {
    expect(containsExifMetadata(new Uint8Array([...ascii("Exif"), 0, 0]))).toBe(
      true,
    );
    expect(containsExifMetadata(new Uint8Array(ascii("WEBPEXIF")))).toBe(true);
  });

  it("accepts output without an EXIF marker", () => {
    expect(containsExifMetadata(new Uint8Array(ascii("WEBPVP8 ")))).toBe(false);
  });
});

describe("validateImageInput", () => {
  it("rejects empty input", () => {
    expect(() => validateImageInput(new Uint8Array())).toThrow("empty");
  });

  it("rejects input above the spike size limit", () => {
    expect(() =>
      validateImageInput(new Uint8Array(MAX_IMAGE_INPUT_BYTES + 1)),
    ).toThrow("20 MB");
  });
});

describe("calculateOutputDimensions", () => {
  it("limits the long edge without changing aspect ratio", () => {
    expect(calculateOutputDimensions(4000, 3000, 1000)).toEqual({
      width: 1000,
      height: 750,
    });
  });

  it("does not enlarge a small image", () => {
    expect(calculateOutputDimensions(640, 480, 1000)).toEqual({
      width: 640,
      height: 480,
    });
  });
});

describe("normalizeImageProcessingOptions", () => {
  it("uses the provisional spike defaults", () => {
    expect(normalizeImageProcessingOptions()).toEqual({
      longEdge: 2560,
      outputType: "image/webp",
      quality: 82,
    });
  });

  it.each([
    { longEdge: 0 },
    { longEdge: 4097 },
    { quality: 0 },
    { quality: 101 },
  ])("rejects an unsafe option: %j", (options) => {
    expect(() => normalizeImageProcessingOptions(options)).toThrow();
  });
});
