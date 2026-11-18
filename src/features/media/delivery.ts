/**
 * Public media delivery contract (ADR-0021, ADR-0022).
 *
 * `/media/<id>.<ext>?w=<width>` is a permanent public URL. Only the widths
 * below are transformed, so arbitrary parameters cannot spend the monthly
 * unique-transformation allowance or expose the original.
 */
export const MEDIA_WIDTHS = [480, 960, 1600, 2400] as const;

export type MediaWidth = (typeof MEDIA_WIDTHS)[number];

const MEDIA_FILE_PATTERN = /^([a-z0-9]{16,32})\.(jpg|png|webp)$/;

// Cloudflare Images caps AVIF output at 1,200 px on either edge.
const AVIF_MAX_WIDTH = 1200;

export interface MediaRequest {
  key: string;
  width: MediaWidth;
}

export function parseMediaRequest(
  fileName: string,
  searchParams: URLSearchParams,
): MediaRequest | null {
  const match = MEDIA_FILE_PATTERN.exec(fileName);

  if (!match) {
    return null;
  }

  const params = [...searchParams.keys()];

  if (params.length !== 1 || params[0] !== "w") {
    return null;
  }

  const width = Number(searchParams.get("w"));

  if (!isMediaWidth(width)) {
    return null;
  }

  return { key: `media/${match[1]}.${match[2]}`, width };
}

function isMediaWidth(value: number): value is MediaWidth {
  return (MEDIA_WIDTHS as readonly number[]).includes(value);
}

/**
 * Root-relative public URL of one variant. `storageKey` is `media/<file>`, so
 * the public path mirrors the object key.
 */
export function mediaUrl(storageKey: string, width: MediaWidth): string {
  return `/${storageKey}?w=${width}`;
}

export function mediaSourceUrl(sourceOrigin: string, key: string) {
  return new URL(`/${key}`, sourceOrigin).toString();
}

/**
 * Supported browsers decode both AVIF and WebP, so the format follows the
 * width alone. The response never varies by `Accept`, which keeps one cache
 * entry per URL.
 */
export function mediaTransformOptions(width: MediaWidth) {
  return {
    width,
    fit: "scale-down",
    format: width <= AVIF_MAX_WIDTH ? "avif" : "webp",
    quality: 80,
    metadata: "none",
    "origin-auth": "share-publicly",
  } as const;
}

export const MEDIA_CACHE_CONTROL = "public, max-age=31536000, immutable";
