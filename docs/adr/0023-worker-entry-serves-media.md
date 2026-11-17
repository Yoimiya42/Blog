# 0023. A custom Worker entry serves `/media` before vinext

- **Status**: Accepted
- **Date**: 2026-11-17
- **Requirements**: FR-BLOG-07, PRD 6.2

## Context

The Worker Preview for Issue #62 served `/media` from a vinext route handler. vinext's Cloudflare CDN adapter moved the handler's `max-age=31536000, immutable` into `CDN-Cache-Control` and sent browsers `public, max-age=0, must-revalidate`. The edge answered `If-None-Match` and `If-Modified-Since` with a full 200, so every visit re-downloaded every image: 1.5 MB for one 2400 px variant.

## Decision

`wrangler.jsonc` sets `main` to `worker/index.ts`. The entry answers `GET` and `HEAD` on `/media/<file>` with `serveMedia` and delegates every other request to `vinext/server/fetch-handler`, the delegation vinext documents. Media responses keep `Cache-Control: public, max-age=31536000, immutable`. No other route changes.

## Trade-offs

- **Gain**: Browsers cache each variant for a year. Image requests skip React rendering and vinext CPU time (TD-002).
- **Accept**: One path bypasses framework middleware. Media must never need session or middleware state that only vinext provides; a later permission check (ADR-0022) runs in `serveMedia`.
- **Reversal**: Low — restore `main` and a route handler.

## Rejected alternatives

- vinext route handler: browser revalidation without 304 costs the full image on every visit.
