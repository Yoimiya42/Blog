import {
  MEDIA_CACHE_CONTROL,
  mediaSourceUrl,
  mediaTransformOptions,
  parseMediaRequest,
} from "../delivery";

interface MediaSourceEnv {
  MEDIA_SOURCE_ORIGIN?: string;
  MEDIA_SOURCE_CLIENT_ID?: string;
  MEDIA_SOURCE_CLIENT_SECRET?: string;
}

export async function serveMedia(request: Request, fileName: string) {
  const media = parseMediaRequest(fileName, new URL(request.url).searchParams);

  if (!media) {
    return new Response("Bad request", { status: 400 });
  }

  // Loaded lazily: the module exists only in the Workers runtime.
  const { env } = (await import("cloudflare:workers")) as {
    env: MediaSourceEnv;
  };
  const origin = env.MEDIA_SOURCE_ORIGIN;
  const clientId = env.MEDIA_SOURCE_CLIENT_ID;
  const clientSecret = env.MEDIA_SOURCE_CLIENT_SECRET;

  if (!origin || !clientId || !clientSecret) {
    console.error(JSON.stringify({ message: "media source not configured" }));
    return new Response("Service unavailable", { status: 503 });
  }

  // The Access service token reaches only the source domain. The transformed
  // result carries no metadata and may be cached publicly (ADR-0022).
  const upstream = await fetch(mediaSourceUrl(origin, media.key), {
    headers: {
      "cf-access-client-id": clientId,
      "cf-access-client-secret": clientSecret,
    },
    cf: { image: mediaTransformOptions(media.width) },
  } as RequestInit);

  if (!upstream.ok) {
    console.error(
      JSON.stringify({
        message: "media transform failed",
        key: media.key,
        width: media.width,
        status: upstream.status,
        cfResized: upstream.headers.get("cf-resized"),
      }),
    );
    // Never fall back to the original: it may be tens of megabytes.
    return new Response(upstream.status === 404 ? "Not found" : "Bad gateway", {
      status: upstream.status === 404 ? 404 : 502,
    });
  }

  const response = new Response(
    request.method === "HEAD" ? null : upstream.body,
    upstream,
  );
  response.headers.set("Cache-Control", MEDIA_CACHE_CONTROL);
  response.headers.delete("Set-Cookie");

  return response;
}
