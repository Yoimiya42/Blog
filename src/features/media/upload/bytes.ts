import { invalidImage } from "./errors";

/**
 * Bounds-checked reads. Every offset in an upload is attacker-controlled, so
 * an out-of-range read rejects the file instead of returning `undefined`.
 */
export function assertRange(bytes: Uint8Array, start: number, length: number) {
  if (
    !Number.isInteger(start) ||
    !Number.isInteger(length) ||
    start < 0 ||
    length < 0 ||
    start + length > bytes.length
  ) {
    throw invalidImage();
  }
}

export function u16be(bytes: Uint8Array, at: number): number {
  assertRange(bytes, at, 2);
  return (bytes[at]! << 8) | bytes[at + 1]!;
}

export function u32be(bytes: Uint8Array, at: number): number {
  assertRange(bytes, at, 4);
  return (
    bytes[at]! * 0x1000000 +
    ((bytes[at + 1]! << 16) | (bytes[at + 2]! << 8) | bytes[at + 3]!)
  );
}

export function u16le(bytes: Uint8Array, at: number): number {
  assertRange(bytes, at, 2);
  return bytes[at]! | (bytes[at + 1]! << 8);
}

export function u24le(bytes: Uint8Array, at: number): number {
  assertRange(bytes, at, 3);
  return bytes[at]! | (bytes[at + 1]! << 8) | (bytes[at + 2]! << 16);
}

export function u32le(bytes: Uint8Array, at: number): number {
  assertRange(bytes, at, 4);
  return (
    bytes[at + 3]! * 0x1000000 +
    ((bytes[at + 2]! << 16) | (bytes[at + 1]! << 8) | bytes[at]!)
  );
}

export function writeU32le(bytes: Uint8Array, at: number, value: number) {
  assertRange(bytes, at, 4);
  bytes[at] = value & 0xff;
  bytes[at + 1] = (value >>> 8) & 0xff;
  bytes[at + 2] = (value >>> 16) & 0xff;
  bytes[at + 3] = (value >>> 24) & 0xff;
}

/** True when `bytes[at..]` equals the ASCII text; false when out of range. */
export function hasAscii(bytes: Uint8Array, at: number, text: string): boolean {
  if (at < 0 || at + text.length > bytes.length) return false;
  for (let index = 0; index < text.length; index += 1) {
    if (bytes[at + index] !== text.charCodeAt(index)) return false;
  }
  return true;
}

export interface ByteRange {
  start: number;
  end: number;
}

/**
 * Removes `drop` ranges by moving the kept bytes forward in the same buffer,
 * and returns a view of the first `end` bytes after compaction. No second
 * full-size buffer is allocated (ADR-0024). `drop` must be sorted and must not
 * overlap.
 */
export function compactInPlace(
  bytes: Uint8Array,
  drop: readonly ByteRange[],
  end: number,
): Uint8Array {
  let write = 0;
  let read = 0;
  for (const range of drop) {
    if (range.start > read) {
      bytes.copyWithin(write, read, range.start);
      write += range.start - read;
    }
    read = range.end;
  }
  if (end > read) {
    bytes.copyWithin(write, read, end);
    write += end - read;
  }

  return bytes.subarray(0, write);
}
