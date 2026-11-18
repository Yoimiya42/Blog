import { compactInPlace, hasAscii, u16be, type ByteRange } from "./bytes";
import { invalidImage, MediaRejectedError } from "./errors";
import { readExif, stripExifGps, type GpsCoordinates } from "./exif";

const EXIF_HEADER = "Exif\0\0";
const ICC_HEADER = "ICC_PROFILE\0";

const MARKER_SOS = 0xda;
const MARKER_EOI = 0xd9;
const MARKER_APP0 = 0xe0;
const MARKER_APP1 = 0xe1;
const MARKER_APP2 = 0xe2;
const MARKER_APP14 = 0xee;
const MARKER_COM = 0xfe;

// Start-of-frame markers that carry dimensions. C4, C8, and CC are not frames.
const SOF_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

interface Segment {
  marker: number;
  /** Offset of the 0xFF that starts the marker. */
  start: number;
  /** Offset just past the segment payload. */
  end: number;
}

interface JpegLayout {
  width: number;
  height: number;
  /** EXIF TIFF blocks as [start, end) offsets. */
  exif: ByteRange[];
  /** Metadata segments that must not be stored. */
  drop: Segment[];
  /** Offset just past the first end-of-image marker. */
  end: number;
}

function isExif(bytes: Uint8Array, segment: Segment): boolean {
  return (
    segment.marker === MARKER_APP1 &&
    hasAscii(bytes, segment.start + 4, EXIF_HEADER)
  );
}

/**
 * Allowlist of segments before the first scan: JFIF, EXIF, ICC profile, and
 * Adobe (needed to decode CMYK). Everything else that can hold metadata goes:
 * XMP and other APP1, MPF and other APP2, APP13 (IPTC and embedded XMP), other
 * vendor APPn segments, and comments.
 */
function shouldDrop(bytes: Uint8Array, segment: Segment): boolean {
  const { marker } = segment;
  if (marker === MARKER_APP0 || marker === MARKER_APP14) return false;
  if (marker === MARKER_APP1) return !isExif(bytes, segment);
  if (marker === MARKER_APP2) {
    return !hasAscii(bytes, segment.start + 4, ICC_HEADER);
  }
  return (marker >= 0xe3 && marker <= 0xef) || marker === MARKER_COM;
}

/**
 * Finds the first end-of-image marker after the scan starts. Inside
 * entropy-coded data 0xFF is followed only by 0x00 or a restart marker, so the
 * first FF D9 ends the primary image. `indexOf` keeps this a native scan.
 */
function findEndOfImage(bytes: Uint8Array, from: number): number {
  let at = bytes.indexOf(0xff, from);
  while (at !== -1 && at + 1 < bytes.length) {
    if (bytes[at + 1] === MARKER_EOI) return at + 2;
    at = bytes.indexOf(0xff, at + 1);
  }
  throw invalidImage();
}

function readLayout(bytes: Uint8Array): JpegLayout {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw invalidImage();

  const exif: ByteRange[] = [];
  const drop: Segment[] = [];
  let width = 0;
  let height = 0;
  let at = 2;

  for (;;) {
    if (bytes[at] !== 0xff) throw invalidImage();
    // Any number of 0xFF fill bytes may precede a marker.
    while (bytes[at + 1] === 0xff) at += 1;
    const marker = bytes[at + 1];
    if (marker === undefined || marker === MARKER_EOI) throw invalidImage();

    // Standalone markers carry no length.
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      at += 2;
      continue;
    }

    const length = u16be(bytes, at + 2);
    if (length < 2) throw invalidImage();
    const segment: Segment = { marker, start: at, end: at + 2 + length };
    if (segment.end > bytes.length) throw invalidImage();

    if (marker === MARKER_SOS) {
      if (width === 0 || height === 0) throw invalidImage();
      return {
        width,
        height,
        exif,
        drop,
        end: findEndOfImage(bytes, segment.end),
      };
    }

    if (SOF_MARKERS.has(marker)) {
      height = u16be(bytes, at + 5);
      width = u16be(bytes, at + 7);
    } else if (isExif(bytes, segment)) {
      exif.push({ start: at + 4 + EXIF_HEADER.length, end: segment.end });
    } else if (shouldDrop(bytes, segment)) {
      drop.push(segment);
    }

    at = segment.end;
  }
}

export interface ParsedJpeg {
  bytes: Uint8Array;
  width: number;
  height: number;
  gps: GpsCoordinates | null;
}

/**
 * Removes location data from a JPEG in place (ADR-0021, ADR-0024): blanks the
 * GPS IFD of each EXIF block, drops metadata segments outside the allowlist,
 * and drops every byte after the primary image, which removes multi-picture
 * secondary images and vendor trailers with their own EXIF.
 */
export function stripJpeg(bytes: Uint8Array): ParsedJpeg {
  const layout = readLayout(bytes);

  const summaries = layout.exif.map((range) => {
    const summary = readExif(bytes, range.start, range.end);
    stripExifGps(bytes, range.start, range.end);
    return summary;
  });
  const gps = summaries.find((summary) => summary.gps)?.gps ?? null;
  // Readers apply the orientation of the first EXIF block.
  const orientation = summaries[0]?.orientation ?? 1;

  const stripped = compactInPlace(bytes, layout.drop, layout.end);
  verifyJpeg(stripped);

  // Orientations 5 to 8 rotate by 90 degrees. Cloudflare Images applies the
  // orientation on delivery, so stored dimensions are the displayed ones.
  const swap = orientation >= 5;

  return {
    bytes: stripped,
    width: swap ? layout.height : layout.width,
    height: swap ? layout.width : layout.height,
    gps,
  };
}

/** Re-parses the stored bytes; any remaining location source rejects them. */
export function verifyJpeg(bytes: Uint8Array) {
  const layout = readLayout(bytes);
  const gpsTags = layout.exif.reduce(
    (total, range) =>
      total + readExif(bytes, range.start, range.end).gpsTagCount,
    0,
  );

  if (gpsTags > 0 || layout.drop.length > 0 || layout.end !== bytes.length) {
    throw new MediaRejectedError("gps_not_removed");
  }
}
