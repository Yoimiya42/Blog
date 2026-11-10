export const DEFAULT_IMAGE_LONG_EDGE = 2560;
export const DEFAULT_IMAGE_QUALITY = 82;
export const MAX_IMAGE_INPUT_BYTES = 20 * 1024 * 1024;
export const MAX_IMAGE_INPUT_PIXELS = 40_000_000;

export type SupportedImageContentType =
  "image/avif" | "image/heic" | "image/jpeg" | "image/png" | "image/webp";

export type ProcessedImageContentType = "image/avif" | "image/webp";

export interface ImageProcessingOptions {
  longEdge?: number;
  outputType?: ProcessedImageContentType;
  quality?: number;
}

export interface ProcessedImage {
  body: Uint8Array;
  contentType: ProcessedImageContentType;
  height: number;
  size: number;
  width: number;
}

const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const HEIC_BRANDS = new Set(["heic", "heix", "hevc", "hevx"]);
const AVIF_BRANDS = new Set(["avif", "avis"]);

function matches(bytes: Uint8Array, signature: number[], offset = 0) {
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

function readAscii(bytes: Uint8Array, offset: number, length: number) {
  return String.fromCharCode(...bytes.slice(offset, offset + length));
}

function includesAscii(bytes: Uint8Array, value: string) {
  const signature = asciiBytes(value);

  return bytes.some((_, offset) =>
    signature.every((byte, index) => bytes[offset + index] === byte),
  );
}

function asciiBytes(value: string) {
  return Array.from(value, (character) => character.charCodeAt(0));
}

export function detectImageContentType(
  bytes: Uint8Array,
): SupportedImageContentType | null {
  if (matches(bytes, JPEG_SIGNATURE)) {
    return "image/jpeg";
  }

  if (matches(bytes, PNG_SIGNATURE)) {
    return "image/png";
  }

  if (
    bytes.length >= 12 &&
    readAscii(bytes, 0, 4) === "RIFF" &&
    readAscii(bytes, 8, 4) === "WEBP"
  ) {
    return "image/webp";
  }

  if (bytes.length >= 12 && readAscii(bytes, 4, 4) === "ftyp") {
    for (let offset = 8; offset + 4 <= bytes.length; offset += 4) {
      const brand = readAscii(bytes, offset, 4);

      if (HEIC_BRANDS.has(brand)) {
        return "image/heic";
      }

      if (AVIF_BRANDS.has(brand)) {
        return "image/avif";
      }
    }
  }

  return null;
}

export function containsExifMetadata(bytes: Uint8Array) {
  return includesAscii(bytes, "Exif\0\0") || includesAscii(bytes, "EXIF");
}

export function validateImageInput(
  bytes: Uint8Array,
  inputSize = bytes.byteLength,
) {
  if (inputSize === 0) {
    throw new Error("Image input is empty.");
  }

  if (inputSize > MAX_IMAGE_INPUT_BYTES) {
    throw new Error("Image input exceeds the 20 MB spike limit.");
  }

  const contentType = detectImageContentType(bytes.subarray(0, 64));

  if (!contentType) {
    throw new Error("Unsupported image content.");
  }

  return contentType;
}

export function calculateOutputDimensions(
  width: number,
  height: number,
  longEdge = DEFAULT_IMAGE_LONG_EDGE,
) {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    !Number.isInteger(longEdge) ||
    longEdge < 1
  ) {
    throw new Error("Image dimensions must be positive integers.");
  }

  const scale = Math.min(1, longEdge / Math.max(width, height));

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function normalizeImageProcessingOptions(
  options: ImageProcessingOptions = {},
) {
  const longEdge = options.longEdge ?? DEFAULT_IMAGE_LONG_EDGE;
  const quality = options.quality ?? DEFAULT_IMAGE_QUALITY;

  if (!Number.isInteger(longEdge) || longEdge < 1 || longEdge > 4096) {
    throw new Error("Image long edge must be between 1 and 4096 pixels.");
  }

  if (!Number.isInteger(quality) || quality < 1 || quality > 100) {
    throw new Error("Image quality must be between 1 and 100.");
  }

  return {
    longEdge,
    outputType: options.outputType ?? "image/webp",
    quality,
  } as const;
}
