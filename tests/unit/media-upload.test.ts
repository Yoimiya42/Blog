import { describe, expect, it } from "vitest";

import { MediaRejectedError } from "@/features/media/upload/errors";
import { readExif } from "@/features/media/upload/exif";
import { verifyJpeg } from "@/features/media/upload/jpeg";
import {
  detectFormat,
  MAX_UPLOAD_BYTES,
  processImage,
} from "@/features/media/upload/process";

import {
  asciiBytes,
  buildJpeg,
  buildPng,
  buildTiff,
  buildWebp,
  containsBytes,
  rationalBytes,
  toDms,
} from "../helpers/images";

const LONDON = { latitude: 51.501364, longitude: -0.14189 };
const SHANGHAI = { latitude: 31.239692, longitude: 121.499755 };

// The seconds rational of the latitude, as buildTiff writes it.
const LATITUDE_SECONDS = rationalBytes(toDms(LONDON.latitude)[2], 1000);

function rejection(run: () => unknown): string | undefined {
  try {
    run();
  } catch (error) {
    if (error instanceof MediaRejectedError) return error.reason;
    throw error;
  }
  return undefined;
}

function expectCoordinates(
  actual: { latitude: number; longitude: number } | null,
  expected: { latitude: number; longitude: number },
) {
  expect(actual?.latitude).toBeCloseTo(expected.latitude, 5);
  expect(actual?.longitude).toBeCloseTo(expected.longitude, 5);
}

/** The EXIF TIFF block of the first APP1 segment of a built JPEG. */
function firstExif(bytes: Uint8Array) {
  const start = bytes.indexOf(0x45); // "E" of "Exif"
  return readExif(bytes, start + 6, bytes.length);
}

describe("detectFormat", () => {
  it("identifies JPEG, PNG, and WebP from magic bytes", () => {
    expect(detectFormat(buildJpeg())).toBe("jpeg");
    expect(detectFormat(buildPng())).toBe("png");
    expect(detectFormat(buildWebp())).toBe("webp");
  });

  it("rejects HEIC with its own message until Issue #65", () => {
    const heic = new Uint8Array([
      0,
      0,
      0,
      24,
      ...asciiBytes("ftypheic"),
      0,
      0,
      0,
      0,
    ]);
    expect(rejection(() => detectFormat(heic))).toBe("heic_unsupported");
  });

  it("rejects other types whatever their name says", () => {
    const gif = new Uint8Array(asciiBytes("GIF89a\x01\x00\x01\x00"));
    expect(rejection(() => detectFormat(gif))).toBe("unsupported_type");
  });
});

describe("processImage: JPEG", () => {
  it("removes every location source and keeps orientation", () => {
    const secondary = buildJpeg({ exif: { gps: SHANGHAI } });
    const input = buildJpeg({
      width: 640,
      height: 480,
      exif: { orientation: 6, gps: LONDON },
      xmp: `<rdf:Description exif:GPSLatitude="51,30.08N"/>`,
      mpf: true,
      comment: "taken at home",
      trailer: secondary,
    });
    const inputLength = input.length;

    const result = processImage(input);

    expect(result.format).toBe("jpeg");
    expectCoordinates(result.gps, LONDON);
    // Orientation 6 rotates by 90 degrees, so the displayed size swaps.
    expect([result.width, result.height]).toEqual([480, 640]);

    const output = result.bytes;
    expect(output.length).toBeLessThan(inputLength);
    expect(containsBytes(output, LATITUDE_SECONDS)).toBe(false);
    expect(containsBytes(output, asciiBytes("xap/1.0"))).toBe(false);
    expect(containsBytes(output, asciiBytes("GPSLatitude"))).toBe(false);
    expect(containsBytes(output, asciiBytes("MPF\0"))).toBe(false);
    expect(containsBytes(output, asciiBytes("taken at home"))).toBe(false);
    expect(containsBytes(output, asciiBytes("ICC_PROFILE"))).toBe(true);
    expect([...output.subarray(-2)]).toEqual([0xff, 0xd9]);

    const exif = firstExif(output);
    expect(exif.orientation).toBe(6);
    expect(exif.gpsTagCount).toBe(0);
    expect(exif.gps).toBeNull();
  });

  it("reads big-endian EXIF", () => {
    const input = buildJpeg({
      exif: { littleEndian: false, gps: SHANGHAI, orientation: 1 },
    });

    const result = processImage(input);

    expectCoordinates(result.gps, SHANGHAI);
    expect(firstExif(result.bytes).gpsTagCount).toBe(0);
  });

  it("leaves a JPEG without location data byte-identical", () => {
    const input = buildJpeg({ exif: { orientation: 1 } });
    const copy = input.slice();

    const result = processImage(input);

    expect(result.gps).toBeNull();
    expect([...result.bytes]).toEqual([...copy]);
  });

  it("refuses a JPEG that still carries GPS", () => {
    const input = buildJpeg({ exif: { gps: LONDON } });
    expect(rejection(() => verifyJpeg(input))).toBe("gps_not_removed");
  });

  it("rejects a truncated file", () => {
    const input = buildJpeg().subarray(0, -2);
    expect(rejection(() => processImage(input))).toBe("invalid_image");
  });

  it("rejects a GPS pointer outside the EXIF block", () => {
    const tiff = buildTiff({ gps: LONDON });
    // IFD0 entry 0 is the GPS pointer; aim it past the end of the block.
    new DataView(tiff.buffer).setUint32(10 + 8, 60_000, true);
    const input = buildJpeg();
    const length = tiff.length + 8;
    const exif = [
      0xff,
      0xe1,
      length >> 8,
      length & 0xff,
      ...asciiBytes("Exif\0\0"),
    ];
    // Control: the same file with a valid pointer is accepted.
    const valid = buildJpeg({ exif: { gps: LONDON } });
    expect(processImage(valid).gps).not.toBeNull();
    const hostile = new Uint8Array([
      0xff,
      0xd8,
      ...exif,
      ...tiff,
      ...input.subarray(2),
    ]);

    expect(rejection(() => processImage(hostile))).toBe("invalid_image");
  });

  it("enforces the edge and pixel limits", () => {
    expect(
      rejection(() => processImage(buildJpeg({ width: 12_001, height: 10 }))),
    ).toBe("too_many_pixels");
    expect(
      rejection(() =>
        processImage(buildJpeg({ width: 11_000, height: 10_000 })),
      ),
    ).toBe("too_many_pixels");
    expect(
      processImage(buildJpeg({ width: 12_000, height: 8_000 })).width,
    ).toBe(12_000);
  });

  it("enforces the size limit before parsing", () => {
    const input = new Uint8Array(MAX_UPLOAD_BYTES + 1);
    expect(rejection(() => processImage(input))).toBe("too_large");
  });
});

describe("processImage: PNG", () => {
  it("drops EXIF, XMP, and trailing bytes and keeps the coordinates", () => {
    const input = buildPng({
      width: 320,
      height: 200,
      exif: { gps: LONDON, orientation: 6 },
      xmp: "<x:xmpmeta/>",
      trailer: new Uint8Array(asciiBytes("trailing")),
    });

    const result = processImage(input);

    expect(result.format).toBe("png");
    expectCoordinates(result.gps, LONDON);
    // The orientation leaves with the EXIF chunk, so nothing is swapped.
    expect([result.width, result.height]).toEqual([320, 200]);
    expect(containsBytes(result.bytes, asciiBytes("eXIf"))).toBe(false);
    expect(containsBytes(result.bytes, asciiBytes("iTXt"))).toBe(false);
    expect(containsBytes(result.bytes, asciiBytes("trailing"))).toBe(false);
    expect(containsBytes(result.bytes, LATITUDE_SECONDS)).toBe(false);
    expect(containsBytes(result.bytes, asciiBytes("IEND"))).toBe(true);
  });
});

describe("processImage: WebP", () => {
  it("drops EXIF and XMP and rewrites the container header", () => {
    const input = buildWebp({
      width: 800,
      height: 600,
      exif: { gps: SHANGHAI },
      xmp: "<x:xmpmeta/>",
    });

    const result = processImage(input);
    const output = result.bytes;
    const view = new DataView(output.buffer, output.byteOffset);

    expect(result.format).toBe("webp");
    expectCoordinates(result.gps, SHANGHAI);
    expect([result.width, result.height]).toEqual([800, 600]);
    expect(view.getUint32(4, true)).toBe(output.length - 8);
    // VP8X flags sit in the first payload byte, after the 20-byte header.
    expect(output[20]! & 0x0c).toBe(0);
    expect(containsBytes(output, asciiBytes("EXIF"))).toBe(false);
    expect(containsBytes(output, asciiBytes("XMP "))).toBe(false);
  });
});
