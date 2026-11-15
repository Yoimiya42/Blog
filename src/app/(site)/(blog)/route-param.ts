/**
 * vinext passes dynamic segments still percent-encoded, so a Chinese tag slug
 * arrives as `%E6...`. Slugs never contain a literal `%`, so decoding is safe
 * whether or not the runtime already decoded. Malformed input stays as-is and
 * matches nothing.
 */
export function decodeRouteParam(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}
