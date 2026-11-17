# Media delivery

Delivery path for uploaded images under ADR-0021 and ADR-0022. Dashboard and API settings are not in version control; recreate them from this file.

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
