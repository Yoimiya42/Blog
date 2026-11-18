export interface StorageUpload {
  body: Uint8Array;
  key: string;
  contentType: string;
}

/**
 * Object storage for media originals. Pages never link to stored objects:
 * delivery derives public URLs and reads originals through the source domain
 * (ADR-0022), so the adapter returns no URL.
 */
export interface StorageAdapter {
  upload(input: StorageUpload): Promise<void>;
  delete(key: string): Promise<void>;
}
