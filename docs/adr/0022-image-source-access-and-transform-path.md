# 0022. Image transform path and source access

- **Status**: Accepted
- **Date**: 2026-11-17
- **Requirements**: FR-ADMIN-06, FR-BLOG-07, PRD 6.4
- **Supersedes**: ADR-0021's deferral of the transform call to Issue #62

## Context

A survey of the owner's Lightroom exports found 852 JPEGs from a 33-megapixel camera. The median is 19.4 MB, the largest 44.6 MB, and 372 (44%) exceed the 20 MB input limit of the Images binding. None carries GPS. ADR-0021 left the transform call open and kept the original reachable through an R2 custom domain.

## Decision

**Transform call.** The Worker calls Cloudflare Images with `fetch` and `cf.image` against the source domain `src.fangmingluan.com`, which accepts sources up to 100 MB. The Images binding is not used.

**Source access.** Cloudflare Access protects `src.fangmingluan.com`. The Worker sends a service token as `cf-access-client-id` and `cf-access-client-secret` with `origin-auth: "share-publicly"`. A direct request without the token is refused. The token lives in Worker secrets.

**Non-public media.** Every `/media` request reaches the Worker. Public media may be cached anywhere. Media that requires a permission check is served only after the Worker checks it, from a cache behind that check. It bypasses Workers Cache, which answers before the Worker runs, and is sent with `Cache-Control: private`. v1 serves all media publicly by unguessable id.

## Trade-offs

- **Gain**: Camera exports work. Originals are never public. A later permission check needs no URL or schema change.
- **Accept**: One Access application and one service token to rotate.
- **Reversal**: Low — the source domain and token are configuration behind a fixed public URL.

## Rejected alternatives

- Images binding: refuses 44% of the owner's exports.
- Public source domain: exposes full-resolution originals to anyone who learns a key.
