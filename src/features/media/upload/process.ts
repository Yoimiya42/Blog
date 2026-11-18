import { hasAscii } from "./bytes";
import { MediaRejectedError } from "./errors";
import type { GpsCoordinates } from "./exif";
import { stripJpeg } from "./jpeg";
import { stripPng } from "./png";
import { stripWebp } from "./webp";

/** Upload limits from ADR-0021. */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
export const MAX_UPLOAD_PIXELS = 100_000_000;
export const MAX_UPLOAD_EDGE = 12_000;

export const MEDIA_FORMATS = {
  jpeg: { mimeType: "image/jpeg", extension: "jpg" },
  png: { mimeType: "image/png", extension: "png" },
  webp: { mimeType: "image/webp", extension: "webp" },
} as const;

export type MediaFormat = keyof typeof MEDIA_FORMATS;

// ISO-BMFF brands written by HEIC and HEIF encoders, including iPhones.
const HEIF_BRANDS = new Set([
  "heic",
  "heix",
  "hevc",
  "hevx",
  "heim",
  "heis",
  "mif1",
  "msf1",
]);

/** Detects the format from magic bytes; the declared type is ignored. */
export function detectFormat(bytes: Uint8Array): MediaFormat {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpeg";
  }
  if (hasAscii(bytes, 0, "\x89PNG\r\n\x1a\n")) return "png";
  if (hasAscii(bytes, 0, "RIFF") && hasAscii(bytes, 8, "WEBP")) return "webp";
  if (hasAscii(bytes, 4, "ftyp")) {
    const brand = String.fromCharCode(...bytes.subarray(8, 12));
    if (HEIF_BRANDS.has(brand)) {
      throw new MediaRejectedError("heic_unsupported");
    }
  }
  throw new MediaRejectedError("unsupported_type");
}

export interface ProcessedImage {
  format: MediaFormat;
  /** A view of the input buffer after in-place stripping. */
  bytes: Uint8Array;
  /** Displayed dimensions, after EXIF orientation. */
  width: number;
  height: number;
  gps: GpsCoordinates | null;
}

const STRIP = { jpeg: stripJpeg, png: stripPng, webp: stripWebp } as const;

/**
 * Validates an upload and removes location data (ADR-0021). Mutates `bytes`:
 * the caller must not reuse the input buffer. Throws MediaRejectedError for
 * any file the owner must fix.
 */
export function processImage(bytes: Uint8Array): ProcessedImage {
  if (bytes.length > MAX_UPLOAD_BYTES) {
    throw new MediaRejectedError("too_large");
  }

  const format = detectFormat(bytes);
  const parsed = STRIP[format](bytes);
  const { width, height } = parsed;
  if (
    width > MAX_UPLOAD_EDGE ||
    height > MAX_UPLOAD_EDGE ||
    width * height > MAX_UPLOAD_PIXELS
  ) {
    throw new MediaRejectedError("too_many_pixels");
  }

  return { format, ...parsed };
}
