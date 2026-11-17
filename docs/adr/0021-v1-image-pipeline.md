# 0021. v1 image pipeline: GPS-clean originals in R2, Cloudflare Images on delivery

- **Status**: Accepted
- **Date**: 2026-11-17
- **Requirements**: FR-ADMIN-05, FR-ADMIN-06, FR-BLOG-07, FR-MOMENT-04, NFR-CN-06, PRD 6.2, PRD 6.4

## Context

The owner uploads camera exports of 20 to 40 MB and phone photos from desktop, phone, and tablet. A Worker cannot decode them: the isolate has 128 MB of memory, and Workers Free allows 10 ms CPU. Browser preprocessing differs by device and cannot guarantee GPS removal. The owner wants photo coordinates kept privately for a later place suggestion (FR-MOMENT-04).

## Decision

**Processing location.** The server is authoritative; the browser uploads the file unchanged. Resizing and format conversion run in Cloudflare Images on delivery, not at upload.

**Upload.** Accept JPEG, PNG, and WebP up to 50 MB, 100 megapixels, and 12,000 px on either edge. The Worker checks the type from magic bytes and reads dimensions from headers without decoding pixels.

**GPS.** At upload, the Worker reads GPS latitude and longitude, then removes GPS before the R2 write. JPEG: zero the GPS IFD in place, which keeps every offset valid and preserves orientation, and drop XMP segments. PNG and WebP: drop EXIF and XMP chunks. The Worker re-parses the result and rejects the upload if any GPS tag remains. Coordinates go to owner-only `Media` columns and are never rendered publicly.

**Originals.** Keep the GPS-clean original in R2 as the transformation source. Pages never reference it.

**Keys and URLs.** Object key `media/<mediaId>.<ext>`, immutable; a replacement gets a new id. Permanent public URL `https://fangmingluan.com/media/<mediaId>.<ext>?w=<width>`, served by the Worker. Allowed widths: 480, 960, 1600, 2400; any other value returns 400. Output uses `format=auto`, quality 80, and `metadata=none`. Issue #62 picks the transform call: the Images binding (20 MB input limit) or `fetch` with `cf.image` against the R2 custom domain (100 MB). The public URL is the same either way.

**`Media` fields.** `id`, `storageKey`, `mimeType`, `width`, `height`, `sizeBytes`, `alt`, `gpsLatitude`, `gpsLongitude`, `createdAt`. Variant URLs are derived, not stored.

## Trade-offs

- **Gain**: Camera originals work. Every device takes one path. GPS removal does not depend on the client.
- **Accept**: Images Free covers 5,000 unique transformations a month, about 1,250 actively viewed images at four widths. New variants fail beyond that. The first `9422` error in Workers Logs triggers Images Paid at $0.50 per 1,000.
- **Reversal**: Medium — public URLs and `Media` fields are permanent; the transform backend behind them can change.

## Deferred

- HEIC input: Issue #65. Removing GPS from ISO-BMFF metadata is unproven; reopen when that issue starts.
- Blurhash placeholders: reopen if layout shift or perceived load fails the release audit.

## Rejected alternatives

- Browser resizing (archived spike `spike/4-image-pipeline`): output varies by device, Safari cannot encode WebP from canvas, and the server still has to verify GPS removal.
- Decoding in the Worker with WASM: a full-size camera decode exceeds 128 MB.
- Images binding for every request: its 20 MB input limit rejects camera exports.
