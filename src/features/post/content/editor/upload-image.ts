import type { ImageUploadConfig } from "../image-upload";

export type { ImageUploadConfig };

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export type ImageUploadResult =
  { ok: true; mediaId: string; alt: string } | { ok: false; message: string };

function errorMessage(body: unknown): string | null {
  if (typeof body === "object" && body !== null && "error" in body) {
    const { error } = body as { error: unknown };
    if (typeof error === "string") return error;
  }
  return null;
}

export async function uploadImage(
  config: ImageUploadConfig,
  file: File,
  alt: string,
): Promise<ImageUploadResult> {
  // The server checks the real type and size; these only save a long upload.
  if (file.size > config.maxBytes) {
    return { ok: false, message: "The file is larger than 50 MB." };
  }
  if (/\.hei[cf]$/i.test(file.name) || /hei[cf]/i.test(file.type)) {
    return {
      ok: false,
      message: "HEIC is not supported yet. Export the photo as JPEG.",
    };
  }

  let response: Response;
  try {
    response = await fetch(config.path, {
      method: "POST",
      body: file,
      credentials: "same-origin",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        [config.altHeader]: encodeURIComponent(alt),
      },
    });
  } catch {
    return { ok: false, message: "The upload failed. Check the connection." };
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    return {
      ok: false,
      message: errorMessage(body) ?? `The upload failed (${response.status}).`,
    };
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as { id?: unknown }).id !== "string"
  ) {
    return { ok: false, message: "The server returned an unexpected reply." };
  }
  const { id, alt: storedAlt } = body as { id: string; alt?: unknown };

  return {
    ok: true,
    mediaId: id,
    alt: typeof storedAlt === "string" ? storedAlt : alt,
  };
}
