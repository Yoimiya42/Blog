import { invalidImage } from "./errors";

/**
 * Minimal TIFF reader for an EXIF block. It reads the orientation and GPS
 * coordinates and blanks the GPS IFD in place. Offsets inside a TIFF block are
 * relative to the block, so the block can later move inside the file without
 * becoming invalid.
 */

const TAG_ORIENTATION = 0x0112;
const TAG_GPS_IFD = 0x8825;
const GPS_LATITUDE_REF = 1;
const GPS_LATITUDE = 2;
const GPS_LONGITUDE_REF = 3;
const GPS_LONGITUDE = 4;

const TYPE_ASCII = 2;
const TYPE_SHORT = 3;
const TYPE_LONG = 4;
const TYPE_RATIONAL = 5;

// Bytes per value for each TIFF field type.
const TYPE_SIZES: Readonly<Record<number, number>> = {
  1: 1,
  2: 1,
  3: 2,
  4: 4,
  5: 8,
  6: 1,
  7: 1,
  8: 2,
  9: 4,
  10: 8,
  11: 4,
  12: 8,
  13: 4,
};

// Real IFDs hold tens of entries; the cap bounds work on hostile input.
const MAX_IFD_ENTRIES = 1000;

export interface GpsCoordinates {
  latitude: number;
  longitude: number;
}

export interface ExifSummary {
  /** EXIF orientation 1 to 8, or 1 when absent or invalid. */
  orientation: number;
  gps: GpsCoordinates | null;
  /** Entries left in every GPS IFD. Zero after a successful strip. */
  gpsTagCount: number;
}

interface IfdEntry {
  tag: number;
  type: number;
  count: number;
  /** Offset of the 12-byte entry, relative to the TIFF block. */
  entryOffset: number;
  /** Offset of the value, relative to the TIFF block. */
  valueOffset: number;
  /** Byte length of the value. */
  valueSize: number;
}

interface Ifd {
  offset: number;
  entries: IfdEntry[];
  next: number;
}

class TiffBlock {
  private readonly view: DataView;
  readonly length: number;
  private readonly littleEndian: boolean;

  constructor(bytes: Uint8Array, start: number, end: number) {
    if (start < 0 || end > bytes.length || end - start < 8) {
      throw invalidImage();
    }
    this.view = new DataView(
      bytes.buffer,
      bytes.byteOffset + start,
      end - start,
    );
    this.length = end - start;

    const order = this.view.getUint16(0);
    if (order === 0x4949) this.littleEndian = true;
    else if (order === 0x4d4d) this.littleEndian = false;
    else throw invalidImage();

    if (this.u16(2) !== 42) throw invalidImage();
  }

  private check(offset: number, size: number) {
    if (offset < 0 || size < 0 || offset + size > this.length) {
      throw invalidImage();
    }
  }

  u8(offset: number): number {
    this.check(offset, 1);
    return this.view.getUint8(offset);
  }

  u16(offset: number): number {
    this.check(offset, 2);
    return this.view.getUint16(offset, this.littleEndian);
  }

  u32(offset: number): number {
    this.check(offset, 4);
    return this.view.getUint32(offset, this.littleEndian);
  }

  zero(offset: number, size: number) {
    this.check(offset, size);
    for (let index = 0; index < size; index += 1) {
      this.view.setUint8(offset + index, 0);
    }
  }

  firstIfdOffset(): number {
    return this.u32(4);
  }

  readIfd(offset: number): Ifd {
    const count = this.u16(offset);
    if (count > MAX_IFD_ENTRIES) throw invalidImage();
    this.check(offset, 2 + count * 12 + 4);

    const entries: IfdEntry[] = [];
    for (let index = 0; index < count; index += 1) {
      const entryOffset = offset + 2 + index * 12;
      const type = this.u16(entryOffset + 2);
      const valueCount = this.u32(entryOffset + 4);
      const typeSize = TYPE_SIZES[type];
      // Unknown types cannot be sized; they hold no value this reader needs.
      const valueSize = typeSize === undefined ? 0 : typeSize * valueCount;
      const valueOffset =
        valueSize <= 4 ? entryOffset + 8 : this.u32(entryOffset + 8);
      if (valueSize > 4) this.check(valueOffset, valueSize);

      entries.push({
        tag: this.u16(entryOffset),
        type,
        count: valueCount,
        entryOffset,
        valueOffset,
        valueSize,
      });
    }

    return { offset, entries, next: this.u32(offset + 2 + count * 12) };
  }

  rational(offset: number): number {
    const numerator = this.u32(offset);
    const denominator = this.u32(offset + 4);
    return denominator === 0 ? Number.NaN : numerator / denominator;
  }
}

/** IFD0 and, when present, IFD1. Later IFDs hold no GPS pointer in EXIF. */
function topLevelIfds(block: TiffBlock): Ifd[] {
  const ifd0 = block.readIfd(block.firstIfdOffset());
  const ifds = [ifd0];
  if (ifd0.next !== 0 && ifd0.next !== ifd0.offset) {
    ifds.push(block.readIfd(ifd0.next));
  }
  return ifds;
}

function gpsIfdOffsets(ifds: readonly Ifd[], block: TiffBlock): number[] {
  const offsets = new Set<number>();
  for (const ifd of ifds) {
    for (const entry of ifd.entries) {
      if (entry.tag !== TAG_GPS_IFD) continue;
      if (entry.type !== TYPE_LONG || entry.count !== 1) throw invalidImage();
      offsets.add(block.u32(entry.valueOffset));
    }
  }
  return [...offsets];
}

function readOrientation(ifd0: Ifd, block: TiffBlock): number {
  const entry = ifd0.entries.find((item) => item.tag === TAG_ORIENTATION);
  if (!entry || entry.type !== TYPE_SHORT || entry.count !== 1) return 1;

  const value = block.u16(entry.valueOffset);
  return value >= 1 && value <= 8 ? value : 1;
}

function readCoordinate(
  gps: Ifd,
  block: TiffBlock,
  valueTag: number,
  refTag: number,
  negativeRef: string,
  limit: number,
): number | null {
  const value = gps.entries.find((entry) => entry.tag === valueTag);
  const ref = gps.entries.find((entry) => entry.tag === refTag);
  if (!value || value.type !== TYPE_RATIONAL || value.count !== 3) return null;
  if (!ref || ref.type !== TYPE_ASCII || ref.count < 1) return null;

  const degrees = block.rational(value.valueOffset);
  const minutes = block.rational(value.valueOffset + 8);
  const seconds = block.rational(value.valueOffset + 16);
  const magnitude = degrees + minutes / 60 + seconds / 3600;
  if (!Number.isFinite(magnitude) || magnitude > limit) return null;

  const sign = String.fromCharCode(block.u8(ref.valueOffset)) === negativeRef;
  return sign ? -magnitude : magnitude;
}

function readGps(gps: Ifd, block: TiffBlock): GpsCoordinates | null {
  const latitude = readCoordinate(
    gps,
    block,
    GPS_LATITUDE,
    GPS_LATITUDE_REF,
    "S",
    90,
  );
  const longitude = readCoordinate(
    gps,
    block,
    GPS_LONGITUDE,
    GPS_LONGITUDE_REF,
    "W",
    180,
  );

  return latitude === null || longitude === null
    ? null
    : { latitude, longitude };
}

/** Reads orientation and GPS from the TIFF block at `bytes[start..end)`. */
export function readExif(
  bytes: Uint8Array,
  start: number,
  end: number,
): ExifSummary {
  const block = new TiffBlock(bytes, start, end);
  const ifds = topLevelIfds(block);

  let gps: GpsCoordinates | null = null;
  let gpsTagCount = 0;
  for (const offset of gpsIfdOffsets(ifds, block)) {
    const ifd = block.readIfd(offset);
    gpsTagCount += ifd.entries.length;
    gps ??= readGps(ifd, block);
  }

  return { orientation: readOrientation(ifds[0]!, block), gps, gpsTagCount };
}

/**
 * Blanks every GPS IFD in place: out-of-line values are zeroed first, then the
 * IFD becomes an empty directory. The pointer to it stays valid, and no other
 * offset in the block moves, so orientation and the rest of EXIF survive.
 */
export function stripExifGps(bytes: Uint8Array, start: number, end: number) {
  const block = new TiffBlock(bytes, start, end);

  for (const offset of gpsIfdOffsets(topLevelIfds(block), block)) {
    const ifd = block.readIfd(offset);
    for (const entry of ifd.entries) {
      if (entry.valueSize > 4) block.zero(entry.valueOffset, entry.valueSize);
    }
    // Count, entries, and next-IFD pointer; a zero count is a valid empty IFD.
    block.zero(offset, 2 + ifd.entries.length * 12 + 4);
  }
}
