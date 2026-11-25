# 0038. Post language versions

- **Status**: Accepted
- **Date**: 2026-11-25
- **Requirements**: FR-BLOG-22, FR-HOME-09

## Context

Cards must show which languages a post is written in. ADR-0007 makes each translation its own publication linked by an internal association. Locale-prefixed routes and interface translation are not in v1.

## Decision

- Each version is its own `post` row with its own slug under `/blog`. `post.language` holds its content language. `post.translation_of` references the original; an original holds null and is never itself a translation.
- A unique partial index on `(coalesce(translation_of, id), language)` over non-deleted rows allows one version per language in a group.
- Languages are validated in the application, not by a `CHECK`: SQLite changes a `CHECK` only by rebuilding `post`.
- Public lists hide a translation while its original is published, so a group shows one card. The marker and the post page read the group's published versions.
- Views and likes stay per version.
- When ADR-0007 routes arrive, a version moves under its locale prefix with a redirect from its `/blog` URL.

## Trade-offs

- **Gain**: Versions reuse the editor, publishing, and slug rules unchanged.
- **Accept**: Each version has its own counts. A tag archive misses a translation whose original lacks the tag.
- **Reversal**: Medium — two columns and one index, but versions gain URLs.

## Rejected alternatives

- Several language bodies in one post: needs a new editor and content model.
