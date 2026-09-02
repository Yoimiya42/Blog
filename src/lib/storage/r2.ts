import { AwsClient } from "aws4fetch";

import type {
  SignedStorageOperation,
  SignedStorageUploadInput,
  StorageAdapter,
  StorageObjectMetadata,
  StorageUpload,
} from "./types";

const MAX_SIGNED_URL_EXPIRY_SECONDS = 7 * 24 * 60 * 60;

export interface R2StorageAdapterOptions {
  accessKeyId: string;
  accountId: string;
  bucketName: string;
  publicBaseUrl: string;
  secretAccessKey: string;
}

export interface R2RequestClient {
  fetch(input: Request | URL | string, init?: RequestInit): Promise<Response>;
  sign(
    input: Request | URL | string,
    init?: RequestInit & {
      aws?: {
        allHeaders?: boolean;
        signQuery?: boolean;
      };
    },
  ): Promise<Request>;
}

function validateKey(key: string) {
  const segments = key.split("/");

  if (
    !key ||
    key.startsWith("/") ||
    segments.some((segment) => !segment || segment === "." || segment === "..")
  ) {
    throw new Error("Invalid storage key.");
  }
}

function validateExpiry(expiresInSeconds: number) {
  if (
    !Number.isInteger(expiresInSeconds) ||
    expiresInSeconds < 1 ||
    expiresInSeconds > MAX_SIGNED_URL_EXPIRY_SECONDS
  ) {
    throw new Error("Signed URL expiry must be between 1 and 604800 seconds.");
  }
}

function encodeKey(key: string) {
  validateKey(key);
  return key.split("/").map(encodeURIComponent).join("/");
}

function readMetadata(key: string, response: Response): StorageObjectMetadata {
  return {
    key,
    size: Number(response.headers.get("content-length") ?? 0),
    etag: response.headers.get("etag"),
    contentType: response.headers.get("content-type"),
  };
}

async function assertSuccessful(response: Response, operation: string) {
  if (!response.ok) {
    throw new Error(`R2 ${operation} failed with status ${response.status}.`);
  }
}

export function createR2StorageAdapter(
  options: R2StorageAdapterOptions,
  client: R2RequestClient = new AwsClient({
    accessKeyId: options.accessKeyId,
    secretAccessKey: options.secretAccessKey,
    service: "s3",
    region: "auto",
  }),
): StorageAdapter {
  const endpoint = `https://${options.accountId}.r2.cloudflarestorage.com/${options.bucketName}`;
  const publicBaseUrl = options.publicBaseUrl.replace(/\/$/, "");

  function objectUrl(key: string) {
    return `${endpoint}/${encodeKey(key)}`;
  }

  function publicUrl(key: string) {
    return `${publicBaseUrl}/${encodeKey(key)}`;
  }

  async function sign(
    key: string,
    method: "GET" | "PUT",
    expiresInSeconds: number,
    headers?: HeadersInit,
  ): Promise<SignedStorageOperation> {
    validateExpiry(expiresInSeconds);
    const url = new URL(objectUrl(key));
    url.searchParams.set("X-Amz-Expires", String(expiresInSeconds));
    const request = await client.sign(url, {
      method,
      headers,
      aws: {
        signQuery: true,
        allHeaders: true,
      },
    });

    return {
      url: request.url,
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
    };
  }

  return {
    async upload(input: StorageUpload) {
      const response = await client.fetch(objectUrl(input.key), {
        method: "PUT",
        headers: {
          "Content-Type": input.contentType,
        },
        body: Uint8Array.from(input.body).buffer,
      });
      await assertSuccessful(response, "upload");

      return {
        key: input.key,
        size: input.body.byteLength,
        etag: response.headers.get("etag"),
        url: publicUrl(input.key),
      };
    },

    async download(key: string) {
      const response = await client.fetch(objectUrl(key), { method: "GET" });
      await assertSuccessful(response, "download");

      return {
        ...readMetadata(key, response),
        body: new Uint8Array(await response.arrayBuffer()),
      };
    },

    async head(key: string) {
      const response = await client.fetch(objectUrl(key), { method: "HEAD" });

      if (response.status === 404) {
        return null;
      }

      await assertSuccessful(response, "metadata read");
      return readMetadata(key, response);
    },

    async delete(key: string) {
      const response = await client.fetch(objectUrl(key), { method: "DELETE" });
      await assertSuccessful(response, "delete");
    },

    async getSignedUrl(key: string, expiresInSeconds: number) {
      return sign(key, "GET", expiresInSeconds);
    },

    async createSignedUpload(input: SignedStorageUploadInput) {
      return sign(input.key, "PUT", input.expiresInSeconds, {
        "Content-Type": input.contentType,
      });
    },
  };
}
