# 0024. Image upload through the Worker entry

- **Status**: Accepted
- **Date**: 2026-11-17
- **Requirements**: FR-ADMIN-05, FR-ADMIN-06, PRD 6.4
- **Supersedes**: ADR-0018 for image upload only; extends ADR-0023's Worker entry

## Context

ADR-0021 accepts uploads up to 50 MB. vinext reads a Server Action body in full before the action runs, so before `requireOwner()`, and its limit (1 MB by default) applies to every action. Raising it would let any visitor make the Worker buffer 50 MB. The isolate has 128 MB, so the upload path must hold one copy of the file.

## Decision

`worker/index.ts` answers `POST /api/media` before vinext and calls `uploadMedia`. In order, it:

1. Rejects a missing or cross-site `Origin` with 403.
2. Reads the owner session from the request cookies through Better Auth; a non-owner gets 404.
3. Requires `Content-Length` of at most 50 MB, else 411 or 413.
4. Reads the raw body (not multipart) into one buffer of that length.
5. Validates, strips GPS, and compacts the buffer in place; no second full-size copy.
6. Writes R2, then the `Media` row; deletes the object if the row fails.

JPEG data after the first end-of-image marker is dropped, which removes multi-picture secondary images and vendor trailers that can carry their own EXIF. APP13 is dropped with XMP.

## Trade-offs

- **Gain**: Authorisation runs before any byte is read. Memory stays near one file size.
- **Accept**: One hand-written endpoint with its own CSRF check. JPEG gain maps are discarded.
- **Reversal**: Low — the service is transport-independent.

## Rejected alternatives

- Server Action with a 50 MB `bodySizeLimit`: unauthenticated bodies are buffered before the owner check.
- vinext route handler: no buffering today, but no framework guarantee against it.
