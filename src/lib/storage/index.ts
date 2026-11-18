import { createR2Storage } from "./r2";
import type { StorageAdapter } from "./types";

export type { StorageAdapter, StorageUpload } from "./types";

/** The media storage of the current environment (`MEDIA` binding). */
export async function getMediaStorage(): Promise<StorageAdapter> {
  // Loaded lazily: the module exists only in the Workers runtime.
  const { env } = await import("cloudflare:workers");

  return createR2Storage(env.MEDIA);
}
