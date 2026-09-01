export interface StorageUpload {
  body: Uint8Array;
  key: string;
  contentType: string;
}

export interface StoredObject {
  key: string;
  url: string;
}

export interface StorageAdapter {
  upload(input: StorageUpload): Promise<StoredObject>;
  delete(key: string): Promise<void>;
  getSignedUrl(key: string, expiresInSeconds: number): Promise<string>;
}
