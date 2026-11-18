import {
  compactInPlace,
  hasAscii,
  u16le,
  u24le,
  u32le,
  writeU32le,
  type ByteRange,
} from "./bytes";
import { invalidImage, MediaRejectedError } from "./errors";
import { readExif, type GpsCoordinates } from "./exif";

const EXIF_PREFIX = "Exif\0\0";
const DROPPED_CHUNKS = new Set(["EXIF", "XMP "]);

// VP8X header flags that announce the dropped chunks.
const VP8X_EXIF_FLAG = 0x08;
const VP8X_XMP_FLAG = 0x04;

interface WebpLayout {
  width: number;
  height: number;
  exif: ByteRange[];
  drop: ByteRange[];
  /** Offset of the VP8X payload, or -1. */
  vp8x: number;
  end: number;
}

function frameSize(
  bytes: Uint8Array,
  type: string,
  data: number,
): [number, number] | null {
  if (type === "VP8X") {
    return [u24le(bytes, data + 4) + 1, u24le(bytes, data + 7) + 1];
  }
  if (type === "VP8 ") {
    // Key frame start code, then 14-bit width and height.
    if (
      bytes[data + 3] !== 0x9d ||
      bytes[data + 4] !== 0x01 ||
      bytes[data + 5] !== 0x2a
    ) {
      throw invalidImage();
    }
    return [u16le(bytes, data + 6) & 0x3fff, u16le(bytes, data + 8) & 0x3fff];
  }
  if (type === "VP8L") {
    if (bytes[data] !== 0x2f) throw invalidImage();
    const bits = u32le(bytes, data + 1);
    return [(bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1];
  }
  return null;
}

function readLayout(bytes: Uint8Array): WebpLayout {
  if (!hasAscii(bytes, 0, "RIFF") || !hasAscii(bytes, 8, "WEBP")) {
    throw invalidImage();
  }
  const end = 8 + u32le(bytes, 4);
  if (end > bytes.length || end % 2 !== 0) throw invalidImage();

  const exif: ByteRange[] = [];
  const drop: ByteRange[] = [];
  let size: [number, number] | null = null;
  let vp8x = -1;
  let at = 12;

  while (at < end) {
    const type = String.fromCharCode(...bytes.subarray(at, at + 4));
    const length = u32le(bytes, at + 4);
    const data = at + 8;
    // Chunks are padded to an even length.
    const chunkEnd = data + length + (length % 2);
    if (chunkEnd > end) throw invalidImage();

    if (type === "VP8X") vp8x = data;
    // VP8X declares the canvas; otherwise the single frame decides.
    if (size === null || type === "VP8X") {
      size = frameSize(bytes, type, data) ?? size;
    }
    if (type === "EXIF") {
      const tiffStart = hasAscii(bytes, data, EXIF_PREFIX)
        ? data + EXIF_PREFIX.length
        : data;
      exif.push({ start: tiffStart, end: data + length });
    }
    if (DROPPED_CHUNKS.has(type)) drop.push({ start: at, end: chunkEnd });

    at = chunkEnd;
  }

  if (!size || size[0] === 0 || size[1] === 0) throw invalidImage();

  return { width: size[0], height: size[1], exif, drop, vp8x, end };
}

export interface ParsedWebp {
  bytes: Uint8Array;
  width: number;
  height: number;
  gps: GpsCoordinates | null;
}

/**
 * Removes EXIF and XMP chunks in place, clears their VP8X flags, rewrites the
 * RIFF size, and drops bytes after the RIFF container.
 */
export function stripWebp(bytes: Uint8Array): ParsedWebp {
  const layout = readLayout(bytes);

  let gps: GpsCoordinates | null = null;
  for (const range of layout.exif) {
    try {
      gps ??= readExif(bytes, range.start, range.end).gps;
    } catch {
      // The chunk is removed either way.
    }
  }

  // Cleared before compaction; the flag byte moves with its chunk.
  if (layout.vp8x !== -1) {
    bytes[layout.vp8x]! &= ~(VP8X_EXIF_FLAG | VP8X_XMP_FLAG);
  }
  const stripped = compactInPlace(bytes, layout.drop, layout.end);
  writeU32le(stripped, 4, stripped.length - 8);
  verifyWebp(stripped);

  return { bytes: stripped, width: layout.width, height: layout.height, gps };
}

export function verifyWebp(bytes: Uint8Array) {
  const layout = readLayout(bytes);
  const flags = layout.vp8x === -1 ? 0 : bytes[layout.vp8x]!;
  if (
    layout.drop.length > 0 ||
    layout.end !== bytes.length ||
    (flags & (VP8X_EXIF_FLAG | VP8X_XMP_FLAG)) !== 0
  ) {
    throw new MediaRejectedError("gps_not_removed");
  }
}
