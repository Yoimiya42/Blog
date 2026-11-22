# Media delivery

Upload and delivery paths for images under ADR-0021, ADR-0022, ADR-0023, and ADR-0024. Dashboard and API settings are not in version control; recreate them from this file.

## Resources

| Resource | Production | Preview |
|---|---|---|
| R2 bucket (binding `MEDIA`) | `blog-media-production` | `blog-media-preview` |
| Source domain (`MEDIA_SOURCE_ORIGIN`) | `src.fangmingluan.com` | `src-preview.fangmingluan.com` |
| Access application | `media-source-production` | `media-source-preview` |
| Worker secrets | `MEDIA_SOURCE_CLIENT_ID`, `MEDIA_SOURCE_CLIENT_SECRET` on the Worker | Same names on the Previews base config |

- Source domains are R2 custom domains on zone `fangmingluan.com`, minimum TLS 1.2. No `*.r2.dev` URL is enabled.
- Both Access applications are self-hosted, hidden from the App Launcher, with one policy: decision `Service Auth` (`non_identity`), include service token `media-source`.
- Service token `media-source` is non-expiring. Zero Trust team: `cold-scene-1460`, Free plan.
- Image Transformations are enabled on zone `fangmingluan.com` (**Images > Transformations**).

## Public URL

`worker/index.ts` answers this path before vinext (ADR-0023). `/media/<id>.<ext>?w=<width>`; `id` is 16 to 32 lowercase letters or digits; `ext` is `jpg`, `png`, or `webp`. `w` is 480, 960, 1600, or 2400 and is the only accepted parameter. Anything else returns 400. Widths up to 960 return AVIF; larger widths return WebP. Responses carry `Cache-Control: public, max-age=31536000, immutable`. A failed transform returns 502 and never the original.

## Upload

`POST /api/media` is answered by `worker/index.ts` before vinext (ADR-0024). The body is the raw file; `X-Media-Alt` carries URI-encoded alt text.

| Status | Cause |
|---|---|
| 201 | Stored. JSON `id`, `url` (1600 px variant), `width`, `height`, `alt` |
| 403 | `Origin` missing or not this site |
| 404 | No owner session |
| 411, 413 | `Content-Length` missing, or above 50 MB |
| 400 | Body shorter or longer than declared, empty, or unreadable alt text |
| 422 | Rejected file: type, HEIC, pixel limits, damaged file, or GPS not removable |
| 500 | Storage or database failure; the R2 object is deleted when the row fails |

Workers Logs events: `media.upload` (id, type, size, `hadGps`; never coordinates), `media.reject` (reason), `media.upload_failed`, `media.orphan` (an object whose cleanup failed; delete it by key).

The `media` table arrives with migration `0007_create_media.sql`. Apply it before the code that uses it; see `d1-migrations.md`.

## Test objects

`media/fixture0000000001.jpg` (28.6 MB) and `media/fixture0000000002.jpg` (37.9 MB) exist in both buckets. Both are synthetic 7008×4672 noise JPEGs with fake GPS EXIF, above the 20 MB Images binding limit.

## Verification

```bash
curl -s -o /dev/null -w "%{http_code}\n" "https://src.fangmingluan.com/media/fixture0000000001.jpg"
curl -s -o /dev/null -w "%{http_code} %{content_type} %{size_download}\n" "https://fangmingluan.com/media/fixture0000000002.jpg?w=960"
curl -s -o /dev/null -w "%{http_code}\n" "https://fangmingluan.com/media/fixture0000000002.jpg?w=1000"
```

Expected: `403` from Access, then `200 image/avif` under 1 MB, then `400`.

## Rotate the service token

1. **Zero Trust > Access controls > Service credentials > Service Tokens > `media-source` > Rotate**. Copy the new Client Secret.
2. Set it on production and on the Previews base config:

```bash
npx wrangler secret put MEDIA_SOURCE_CLIENT_SECRET
npx wrangler preview base-config secret put MEDIA_SOURCE_CLIENT_SECRET
```

3. Run the verification block. Setting a production secret deploys a new version at once; check `npx wrangler deployments list`.

Existing Previews keep the old secret. Delete and recreate them, or set the secret with `npx wrangler preview secret put`.

## Evidence

- 2026-11-17: both source domains returned `403` without the token.
- 2026-11-17, Worker Preview `feat-62-r2-image-delivery`, commit `f4614e6` (vinext route handler): both fixtures returned `200` at all four widths. Outputs measured 480×320 and 960×640 AVIF, 1600×1066 and 2400×1600 WebP, with no EXIF, XMP, or ICC data. A cold transform of a 28.6 MB or 37.9 MB source took 4 to 16 s from a UK network through a local proxy; edge hits returned `CF-Cache-Status: HIT`. `w=1000`, a missing `w`, and an extra parameter returned `400`; an unknown id returned `404`. Browsers received `max-age=0, must-revalidate` and the edge never returned 304, which led to ADR-0023.
- 2026-11-17, same Preview, commit `a0257e6` (custom Worker entry): `/`, `/blog`, and `/login` returned `200`. All four widths returned `200` with `Cache-Control: public, max-age=31536000, immutable` and `CF-Cache-Status: HIT`; `HEAD` returned headers only; `w=1000` returned `400`; an unknown id returned `404`.
- 2026-11-17, production, commit `57b5e79`: both source domains returned `403` without the token. `w=480` and `w=960` returned `200` AVIF; `w=1600` and `w=2400` returned `200` WebP. All four carried `Cache-Control: public, max-age=31536000, immutable`, and repeat requests returned `CF-Cache-Status: HIT`. `w=1000`, a missing `w`, and an extra parameter returned `400`; an unknown id returned `404`; `HEAD` returned headers only; `/`, `/blog`, and `/login` returned `200`. Cold transforms took 3 to 10 s and cached responses 0.6 to 4.9 s from a UK network through a local proxy; the proxy is the suspected cause, not proven.
- 2026-11-18, Worker Preview `feat-14-image-upload`, commit `79db29f` (upload, #14), owner session in a desktop browser:
  - Editor: choosing a file uploaded it at once and showed the image in the editor; alt text reached the stored node. After save and publish, an anonymous request returned `200` with `<img alt=… width="1200" height="800">`, and the variant returned `200` WebP. The test post was deleted.
  - A 27.5 MB, 6000×4000 noise JPEG with fake GPS EXIF returned `201` after 47.6 s end to end, about 0.6 MB/s upload. Worker CPU 204 ms, wall 1,505 ms, outcome ok (TD-005). The row kept the coordinates; the `w=1600` WebP variant contained no `Exif` or `GPS` bytes. A 1200×800 JPEG used 11 ms CPU.
  - A 70 MB body returned `413` (6 to 8 ms CPU). The browser sent the whole body before reading the reply, 82 s on this link.
  - GIF returned `422` "Use a JPEG, PNG, or WebP image." HEIC returned `422` with or without an `image/jpeg` content type. The editor refused a `.HEIC` file with no request sent.
- Mainland China, 2026-11-22, production: the owner reported that a tester on a direct mainland connection opened a post with an image. The page loaded in an acceptable time and the image opened. Network type and load times were not measured; #19 repeats the test with measurements. Recorded, not blocking (ADR-0020).
