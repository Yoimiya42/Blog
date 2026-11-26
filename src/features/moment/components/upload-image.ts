/**
 * The upload contract the admin page passes in (ADR-0024), so the composer
 * bundle never imports the media module.
 */
export interface MomentUploadConfig {
  path: string;
  altHeader: string;
  maxBytes: number;
}

export const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png,image/webp";

export type UploadResult =
  { ok: true; mediaId: string } | { ok: false; message: string };

function errorMessage(body: unknown): string | null {
  if (typeof body === "object" && body !== null && "error" in body) {
    const { error } = body as { error: unknown };
    if (typeof error === "string") return error;
  }
  return null;
}

/**
 * Sends one file to `POST /api/media`. Second caller of this endpoint after
 * the post editor; a third would justify a shared client in the media module.
 */
export async function uploadMomentImage(
  config: MomentUploadConfig,
  file: File,
): Promise<UploadResult> {
  // The server checks the real type and size; these only save a long upload.
  if (file.size > config.maxBytes) {
    return { ok: false, message: "The file is larger than 50 MB." };
  }
  if (/\.hei[cf]$/i.test(file.name) || /hei[cf]/i.test(file.type)) {
    return { ok: false, message: "HEIC is not supported. Use JPEG." };
  }

  let response: Response;
  try {
    response = await fetch(config.path, {
      method: "POST",
      body: file,
      credentials: "same-origin",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        // Moment images carry no alt text yet; empty marks them decorative.
        [config.altHeader]: "",
      },
    });
  } catch {
    return { ok: false, message: "Upload failed. Check the connection." };
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    return {
      ok: false,
      message: errorMessage(body) ?? `Upload failed (${response.status}).`,
    };
  }

  const id = (body as { id?: unknown } | null)?.id;
  return typeof id === "string"
    ? { ok: true, mediaId: id }
    : { ok: false, message: "The server returned an unexpected reply." };
}
