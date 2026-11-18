import { compactInPlace, hasAscii, u32be, type ByteRange } from "./bytes";
import { invalidImage, MediaRejectedError } from "./errors";
import { readExif, type GpsCoordinates } from "./exif";

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const EXIF_PREFIX = "Exif\0\0";

// eXIf holds EXIF; the text chunks hold XMP and ImageMagick raw profiles.
// Whole chunks are removed, so no CRC needs recomputing.
const DROPPED_CHUNKS = new Set(["eXIf", "tEXt", "zTXt", "iTXt"]);

interface Chunk {
  type: string;
  start: number;
  dataStart: number;
  dataEnd: number;
  end: number;
}

interface PngLayout {
  width: number;
  height: number;
  exif: ByteRange[];
  drop: ByteRange[];
  end: number;
}

function readLayout(bytes: Uint8Array): PngLayout {
  if (!SIGNATURE.every((value, index) => bytes[index] === value)) {
    throw invalidImage();
  }

  const exif: ByteRange[] = [];
  const drop: ByteRange[] = [];
  let width = 0;
  let height = 0;
  let at = SIGNATURE.length;

  for (;;) {
    const length = u32be(bytes, at);
    if (length > 0x7fffffff) throw invalidImage();
    const chunk: Chunk = {
      type: String.fromCharCode(...bytes.subarray(at + 4, at + 8)),
      start: at,
      dataStart: at + 8,
      dataEnd: at + 8 + length,
      end: at + 12 + length,
    };
    if (chunk.end > bytes.length) throw invalidImage();

    if (chunk.start === SIGNATURE.length) {
      if (chunk.type !== "IHDR") throw invalidImage();
      width = u32be(bytes, chunk.dataStart);
      height = u32be(bytes, chunk.dataStart + 4);
    }

    if (chunk.type === "IEND") {
      if (width === 0 || height === 0) throw invalidImage();
      return { width, height, exif, drop, end: chunk.end };
    }

    if (chunk.type === "eXIf") {
      // The spec stores bare TIFF; some writers keep the JPEG prefix.
      const tiffStart = hasAscii(bytes, chunk.dataStart, EXIF_PREFIX)
        ? chunk.dataStart + EXIF_PREFIX.length
        : chunk.dataStart;
      exif.push({ start: tiffStart, end: chunk.dataEnd });
    }
    if (DROPPED_CHUNKS.has(chunk.type)) {
      drop.push({ start: chunk.start, end: chunk.end });
    }

    at = chunk.end;
  }
}

export interface ParsedPng {
  bytes: Uint8Array;
  width: number;
  height: number;
  gps: GpsCoordinates | null;
}

/**
 * Removes EXIF and text chunks in place and drops bytes after IEND. EXIF
 * orientation goes with the chunk, so stored dimensions are the pixel ones.
 */
export function stripPng(bytes: Uint8Array): ParsedPng {
  const layout = readLayout(bytes);

  let gps: GpsCoordinates | null = null;
  for (const range of layout.exif) {
    try {
      gps ??= readExif(bytes, range.start, range.end).gps;
    } catch {
      // The chunk is removed either way; unreadable EXIF only loses the
      // private coordinates.
    }
  }

  const stripped = compactInPlace(bytes, layout.drop, layout.end);
  verifyPng(stripped);

  return { bytes: stripped, width: layout.width, height: layout.height, gps };
}

export function verifyPng(bytes: Uint8Array) {
  const layout = readLayout(bytes);
  if (layout.drop.length > 0 || layout.end !== bytes.length) {
    throw new MediaRejectedError("gps_not_removed");
  }
}
