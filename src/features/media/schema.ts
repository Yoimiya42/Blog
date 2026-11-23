import type { MediaFormat } from "./upload/process";

export type { MediaFormat };

export type MediaMimeType = "image/jpeg" | "image/png" | "image/webp";

/** A stored image. Coordinates are owner-only (ADR-0021). */
export interface Media {
  id: string;
  storageKey: string;
  mimeType: MediaMimeType;
  width: number;
  height: number;
  sizeBytes: number;
  alt: string;
  gpsLatitude: number | null;
  gpsLongitude: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export type NewMedia = Omit<Media, "createdAt" | "updatedAt">;

/** What a page needs to render an image. Carries no coordinates. */
export interface MediaDisplay {
  id: string;
  storageKey: string;
  width: number;
  height: number;
}

/** Thrown when a non-owner reaches a media mutation. */
export class MediaAccessDeniedError extends Error {
  constructor() {
    super("media access denied");
    this.name = "MediaAccessDeniedError";
  }
}

/** Visibility tiers of the editor background, in percent (FR-ADMIN-26). */
export const EDITOR_BACKGROUND_OPACITIES = [0, 25, 50, 75, 100] as const;

export type EditorBackgroundOpacity =
  (typeof EDITOR_BACKGROUND_OPACITIES)[number];

export function isEditorBackgroundOpacity(
  value: unknown,
): value is EditorBackgroundOpacity {
  return (EDITOR_BACKGROUND_OPACITIES as readonly unknown[]).includes(value);
}

/** One owner's stored background choice (ADR-0031). */
export interface EditorBackground {
  mediaId: string | null;
  opacity: EditorBackgroundOpacity;
}
