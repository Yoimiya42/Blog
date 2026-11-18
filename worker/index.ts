import vinextHandler from "vinext/server/fetch-handler";
import {
  MEDIA_UPLOAD_PATH,
  serveMedia,
  uploadMedia,
} from "../src/features/media";

interface FetchHandler {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response>;
}

const MEDIA_PATH = /^\/media\/([^/]+)$/;

/**
 * `/media/*` is answered before vinext. vinext's Cloudflare CDN adapter
 * rewrites every cacheable `Cache-Control` to `max-age=0, must-revalidate`,
 * and the edge never answers those revalidations with 304, so browsers would
 * re-download every image on every visit (ADR-0023).
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const { pathname } = new URL(request.url);
    const match = MEDIA_PATH.exec(pathname);

    if (match && (request.method === "GET" || request.method === "HEAD")) {
      return serveMedia(request, match[1]);
    }

    // Uploads bypass vinext so the owner check runs before the body is read
    // (ADR-0024).
    if (pathname === MEDIA_UPLOAD_PATH && request.method === "POST") {
      return uploadMedia(request);
    }

    return (vinextHandler as FetchHandler).fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
