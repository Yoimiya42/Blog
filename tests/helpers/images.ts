/**
 * Byte-level image builders for upload tests. The files are structurally valid
 * containers with fake GPS metadata; their pixel data is not decodable.
 */

export interface TiffOptions {
  littleEndian?: boolean;
  orientation?: number;
  gps?: { latitude: number; longitude: number };
}

/** Distinctive degree values let tests search the output for leaked bytes. */
export function toDms(value: number): [number, number, number] {
  const absolute = Math.abs(value);
  const degrees = Math.floor(absolute);
  const minutes = Math.floor((absolute - degrees) * 60);
  const seconds = Math.round(((absolute - degrees) * 60 - minutes) * 60 * 1000);
  return [degrees, minutes, seconds];
}

export function buildTiff(options: TiffOptions = {}): Uint8Array {
  const little = options.littleEndian ?? true;
  const bytes = new Uint8Array(512);
  const view = new DataView(bytes.buffer);
  const u16 = (at: number, value: number) => view.setUint16(at, value, little);
  const u32 = (at: number, value: number) => view.setUint32(at, value, little);

  bytes.set(little ? [0x49, 0x49] : [0x4d, 0x4d], 0);
  u16(2, 42);
  u32(4, 8);

  const ifd0: [number, number, number, number][] = [];
  if (options.orientation !== undefined) {
    ifd0.push([0x0112, 3, 1, options.orientation]);
  }
  const gpsOffset = 200;
  if (options.gps) ifd0.push([0x8825, 4, 1, gpsOffset]);

  u16(8, ifd0.length);
  ifd0.forEach(([tag, type, count, value], index) => {
    const at = 10 + index * 12;
    u16(at, tag);
    u16(at + 2, type);
    u32(at + 4, count);
    if (type === 3) u16(at + 8, value);
    else u32(at + 8, value);
  });
  u32(10 + ifd0.length * 12, 0);

  if (options.gps) {
    const { latitude, longitude } = options.gps;
    const values = 300;
    const entries: [number, number, number, number | string][] = [
      [1, 2, 2, latitude < 0 ? "S" : "N"],
      [2, 5, 3, values],
      [3, 2, 2, longitude < 0 ? "W" : "E"],
      [4, 5, 3, values + 24],
    ];
    u16(gpsOffset, entries.length);
    entries.forEach(([tag, type, count, value], index) => {
      const at = gpsOffset + 2 + index * 12;
      u16(at, tag);
      u16(at + 2, type);
      u32(at + 4, count);
      if (typeof value === "string") bytes[at + 8] = value.charCodeAt(0);
      else u32(at + 8, value);
    });
    u32(gpsOffset + 2 + entries.length * 12, 0);

    [latitude, longitude].forEach((coordinate, axis) => {
      const [degrees, minutes, milliseconds] = toDms(coordinate);
      const base = values + axis * 24;
      u32(base, degrees);
      u32(base + 4, 1);
      u32(base + 8, minutes);
      u32(base + 12, 1);
      u32(base + 16, milliseconds);
      u32(base + 20, 1000);
    });
  }

  return bytes;
}

function ascii(text: string): number[] {
  return [...text].map((char) => char.charCodeAt(0));
}

function segment(marker: number, payload: ArrayLike<number>): number[] {
  const length = payload.length + 2;
  return [0xff, marker, length >> 8, length & 0xff, ...Array.from(payload)];
}

export interface JpegOptions {
  width?: number;
  height?: number;
  exif?: TiffOptions;
  xmp?: string;
  mpf?: boolean;
  comment?: string;
  /** Bytes appended after the end-of-image marker. */
  trailer?: Uint8Array;
}

export function buildJpeg(options: JpegOptions = {}): Uint8Array {
  const width = options.width ?? 640;
  const height = options.height ?? 480;
  const bytes: number[] = [0xff, 0xd8];

  bytes.push(...segment(0xe0, [...ascii("JFIF\0"), 1, 1, 0, 0, 1, 0, 1, 0, 0]));
  if (options.exif) {
    bytes.push(
      ...segment(0xe1, [...ascii("Exif\0\0"), ...buildTiff(options.exif)]),
    );
  }
  if (options.xmp) {
    bytes.push(
      ...segment(0xe1, [
        ...ascii("http://ns.adobe.com/xap/1.0/\0"),
        ...ascii(options.xmp),
      ]),
    );
  }
  bytes.push(...segment(0xe2, [...ascii("ICC_PROFILE\0"), 1, 1, 0, 0, 0, 0]));
  if (options.mpf) {
    bytes.push(...segment(0xe2, [...ascii("MPF\0"), 0x49, 0x49, 0x2a, 0]));
  }
  if (options.comment) bytes.push(...segment(0xfe, ascii(options.comment)));

  // SOF0: precision, height, width, one component.
  bytes.push(
    ...segment(0xc0, [
      8,
      height >> 8,
      height & 0xff,
      width >> 8,
      width & 0xff,
      1,
      1,
      0x11,
      0,
    ]),
  );
  bytes.push(...segment(0xda, [1, 1, 0, 0, 0x3f, 0]));
  // Entropy data with byte stuffing and a restart marker.
  bytes.push(0x12, 0xff, 0x00, 0x34, 0xff, 0xd0, 0x56, 0xff, 0xd9);

  const result = new Uint8Array(bytes.length + (options.trailer?.length ?? 0));
  result.set(bytes, 0);
  if (options.trailer) result.set(options.trailer, bytes.length);
  return result;
}

function crcTable(): Uint32Array {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
}

const CRC = crcTable();

function pngChunk(type: string, data: ArrayLike<number>): number[] {
  const body = [...ascii(type), ...Array.from(data)];
  let crc = 0xffffffff;
  for (const byte of body) crc = CRC[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  crc = (crc ^ 0xffffffff) >>> 0;
  const length = data.length;
  return [
    length >>> 24,
    (length >>> 16) & 0xff,
    (length >>> 8) & 0xff,
    length & 0xff,
    ...body,
    crc >>> 24,
    (crc >>> 16) & 0xff,
    (crc >>> 8) & 0xff,
    crc & 0xff,
  ];
}

export interface PngOptions {
  width?: number;
  height?: number;
  exif?: TiffOptions;
  xmp?: string;
  trailer?: Uint8Array;
}

export function buildPng(options: PngOptions = {}): Uint8Array {
  const width = options.width ?? 320;
  const height = options.height ?? 200;
  const be32 = (value: number) => [
    value >>> 24,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  ];
  const bytes = [0x89, ...ascii("PNG\r\n\x1a\n")];
  bytes.push(
    ...pngChunk("IHDR", [...be32(width), ...be32(height), 8, 2, 0, 0, 0]),
  );
  if (options.exif) bytes.push(...pngChunk("eXIf", buildTiff(options.exif)));
  if (options.xmp) {
    bytes.push(
      ...pngChunk("iTXt", [
        ...ascii("XML:com.adobe.xmp\0\0\0\0\0"),
        ...ascii(options.xmp),
      ]),
    );
  }
  bytes.push(...pngChunk("IDAT", [0x78, 0x9c, 0x01, 0x02, 0x03]));
  bytes.push(...pngChunk("IEND", []));

  const result = new Uint8Array(bytes.length + (options.trailer?.length ?? 0));
  result.set(bytes, 0);
  if (options.trailer) result.set(options.trailer, bytes.length);
  return result;
}

export interface WebpOptions {
  width?: number;
  height?: number;
  exif?: TiffOptions;
  xmp?: string;
}

function riffChunk(type: string, data: ArrayLike<number>): number[] {
  const length = data.length;
  const chunk = [
    ...ascii(type),
    length & 0xff,
    (length >>> 8) & 0xff,
    (length >>> 16) & 0xff,
    length >>> 24,
    ...Array.from(data),
  ];
  if (length % 2 === 1) chunk.push(0);
  return chunk;
}

/** Extended WebP: VP8X canvas, metadata chunks, and a lossless frame. */
export function buildWebp(options: WebpOptions = {}): Uint8Array {
  const width = options.width ?? 800;
  const height = options.height ?? 600;
  const le24 = (value: number) => [
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
  ];
  const flags = (options.exif ? 0x08 : 0) | (options.xmp ? 0x04 : 0);
  const bits = ((width - 1) & 0x3fff) | (((height - 1) & 0x3fff) << 14);

  const chunks = [
    ...riffChunk("VP8X", [
      flags,
      0,
      0,
      0,
      ...le24(width - 1),
      ...le24(height - 1),
    ]),
    ...riffChunk("VP8L", [
      0x2f,
      bits & 0xff,
      (bits >>> 8) & 0xff,
      (bits >>> 16) & 0xff,
      bits >>> 24,
      0,
      0,
    ]),
    ...(options.exif ? riffChunk("EXIF", buildTiff(options.exif)) : []),
    ...(options.xmp ? riffChunk("XMP ", ascii(options.xmp)) : []),
  ];
  const size = chunks.length + 4;

  return new Uint8Array([
    ...ascii("RIFF"),
    size & 0xff,
    (size >>> 8) & 0xff,
    (size >>> 16) & 0xff,
    size >>> 24,
    ...ascii("WEBP"),
    ...chunks,
  ]);
}

/** True when `needle` occurs anywhere in `haystack`. */
export function containsBytes(
  haystack: Uint8Array,
  needle: ArrayLike<number>,
): boolean {
  outer: for (let at = 0; at + needle.length <= haystack.length; at += 1) {
    for (let index = 0; index < needle.length; index += 1) {
      if (haystack[at + index] !== needle[index]) continue outer;
    }
    return true;
  }
  return false;
}

export function asciiBytes(text: string): number[] {
  return ascii(text);
}

/** Little-endian rational bytes as `buildTiff` writes them. */
export function rationalBytes(
  numerator: number,
  denominator: number,
): number[] {
  const view = new DataView(new ArrayBuffer(8));
  view.setUint32(0, numerator, true);
  view.setUint32(4, denominator, true);
  return [...new Uint8Array(view.buffer)];
}
