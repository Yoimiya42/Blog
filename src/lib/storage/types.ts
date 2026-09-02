export interface StorageUpload {
  body: Uint8Array;
  key: string;
  contentType: string;
}

export interface StoredObject {
  etag: string | null;
  key: string;
  size: number;
  url: string;
}

export interface StorageObjectMetadata {
  contentType: string | null;
  etag: string | null;
  key: string;
  size: number;
}

export interface StorageDownload extends StorageObjectMetadata {
  body: Uint8Array;
}

export interface SignedStorageOperation {
  expiresAt: string;
  url: string;
}

export interface SignedStorageUploadInput {
  contentType: string;
  expiresInSeconds: number;
  key: string;
}

export interface StorageAdapter {
  upload(input: StorageUpload): Promise<StoredObject>;
  download(key: string): Promise<StorageDownload>;
  head(key: string): Promise<StorageObjectMetadata | null>;
  delete(key: string): Promise<void>;
  getSignedUrl(
    key: string,
    expiresInSeconds: number,
  ): Promise<SignedStorageOperation>;
  createSignedUpload(
    input: SignedStorageUploadInput,
  ): Promise<SignedStorageOperation>;
}
