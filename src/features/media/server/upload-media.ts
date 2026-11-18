import { mediaUrl } from "../delivery";
import { MediaAccessDeniedError } from "../schema";
import { MediaRejectedError } from "../upload/errors";
import { MAX_UPLOAD_BYTES } from "../upload/process";

/** The public path the Worker entry routes to `uploadMedia`. */
export const MEDIA_UPLOAD_PATH = "/api/media";

/** Request header with the URI-encoded alt text; headers must be ASCII. */
export const MEDIA_ALT_HEADER = "X-Media-Alt";

export interface MediaUploadResponse {
  id: string;
  url: string;
  width: number;
  height: number;
  alt: string;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function failure(status: number, message: string): Response {
  return json(status, { error: message });
}

/**
 * Reads exactly `length` bytes into one buffer. Returns null when the body is
 * shorter or longer than declared, so a lying header cannot grow the buffer.
 */
async function readBody(
  body: ReadableStream<Uint8Array>,
  length: number,
): Promise<Uint8Array | null> {
  const buffer = new Uint8Array(length);
  const reader = body.getReader();
  let offset = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (offset + value.length > length) {
      await reader.cancel();
      return null;
    }
    buffer.set(value, offset);
    offset += value.length;
  }

  return offset === length ? buffer : null;
}

function readAlt(request: Request): string | null {
  const raw = request.headers.get(MEDIA_ALT_HEADER);
  if (raw === null) return "";
  try {
    return decodeURIComponent(raw);
  } catch {
    return null;
  }
}

/**
 * `POST /api/media` (ADR-0024). The order matters: origin and owner are
 * checked before any body byte is read, and the declared length before the
 * buffer is allocated. The body is the raw file, not a multipart form.
 */
export async function uploadMedia(request: Request): Promise<Response> {
  // CSRF: a cross-site form or fetch carries a foreign Origin, and browsers
  // always send Origin on POST.
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return failure(403, "Forbidden.");
  }

  // Loaded lazily: auth and storage need the Workers runtime.
  const [{ readOwnerSession }, { ARTICLE_IMAGE_WIDTH, getMediaService }] =
    await Promise.all([import("@/features/auth"), import("./media.service")]);

  const session = await readOwnerSession(request.headers);
  // Same answer as the admin pages: the endpoint is not disclosed.
  if (!session) return failure(404, "Not found.");

  const declared = request.headers.get("content-length");
  if (declared === null || !/^\d+$/.test(declared) || !request.body) {
    return failure(411, "The upload needs a Content-Length.");
  }
  const length = Number(declared);
  if (length === 0) return failure(400, "The file is empty.");
  if (length > MAX_UPLOAD_BYTES) {
    return failure(413, new MediaRejectedError("too_large").message);
  }

  const alt = readAlt(request);
  if (alt === null) return failure(400, "The alt text could not be read.");

  const bytes = await readBody(request.body, length);
  if (!bytes) return failure(400, "The upload was incomplete.");

  try {
    const service = await getMediaService();
    const media = await service.upload(session, bytes, alt);

    return json(201, {
      id: media.id,
      url: mediaUrl(media.storageKey, ARTICLE_IMAGE_WIDTH),
      width: media.width,
      height: media.height,
      alt: media.alt,
    } satisfies MediaUploadResponse);
  } catch (error) {
    if (error instanceof MediaRejectedError) {
      console.info(
        JSON.stringify({ event: "media.reject", reason: error.reason }),
      );
      return failure(422, error.message);
    }
    if (error instanceof MediaAccessDeniedError) {
      return failure(404, "Not found.");
    }
    console.error(
      JSON.stringify({ event: "media.upload_failed", error: String(error) }),
    );
    return failure(500, "The upload failed. Try again.");
  }
}
