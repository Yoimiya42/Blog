export type MediaRejection =
  | "too_large"
  | "unsupported_type"
  | "heic_unsupported"
  | "too_many_pixels"
  | "invalid_image"
  | "gps_not_removed"
  | "alt_too_long";

const MESSAGES: Record<MediaRejection, string> = {
  too_large: "The file is larger than 50 MB.",
  unsupported_type: "Use a JPEG, PNG, or WebP image.",
  heic_unsupported: "HEIC is not supported yet. Export the photo as JPEG.",
  too_many_pixels:
    "The image is larger than 100 megapixels or 12,000 px on an edge.",
  invalid_image: "The image file is damaged or incomplete.",
  gps_not_removed: "Location data could not be removed from this image.",
  alt_too_long: "Alt text must be 500 characters or fewer.",
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
