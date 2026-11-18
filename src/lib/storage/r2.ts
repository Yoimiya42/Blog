import type { StorageAdapter } from "./types";

export function createR2Storage(bucket: R2Bucket): StorageAdapter {
  return {
    async upload({ body, key, contentType }) {
      // Keys are immutable (ADR-0021): an existing object is never replaced.
      const stored = await bucket.put(key, body, {
        httpMetadata: { contentType },
        onlyIf: new Headers({ "If-None-Match": "*" }),
      });
      if (stored === null) {
        throw new Error(`storage key already exists: ${key}`);
      }
    },

    async delete(key) {
      await bucket.delete(key);
    },
  };
}
