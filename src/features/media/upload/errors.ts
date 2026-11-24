export type MediaRejection =
  | "too_large"
  | "unsupported_type"
  | "heic_unsupported"
  | "too_many_pixels"
  | "invalid_image"
  | "gps_not_removed"
  | "alt_too_long";

const MESSAGES: Record<MediaRejection, string> = {
  too_large: "Max 50 MB",
  unsupported_type: "JPEG, PNG, or WebP only",
  heic_unsupported: "HEIC not supported. Use JPEG.",
  too_many_pixels: "Max 100 MP or 12,000 px per side",
  invalid_image: "Damaged image file",
  gps_not_removed: "Couldn’t remove location data",
  alt_too_long: "Alt text: max 500 characters",
};

/** A file the owner can fix. The message is safe to show in the admin. */
export class MediaRejectedError extends Error {
  readonly reason: MediaRejection;

  constructor(reason: MediaRejection) {
    super(MESSAGES[reason]);
    this.name = "MediaRejectedError";
    this.reason = reason;
  }
}

export function invalidImage(): MediaRejectedError {
  return new MediaRejectedError("invalid_image");
}
