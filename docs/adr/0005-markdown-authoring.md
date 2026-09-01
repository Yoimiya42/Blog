# 0005. Pure Markdown authoring

- **Status**: Accepted
- **Date**: 2026-08-31
- **Requirements**: FR-BLOG-02, FR-BLOG-03, FR-BLOG-05, FR-BLOG-06, FR-ADMIN-03, FR-ADMIN-09

## Context

v1 needs portable content, fast mobile publishing, preview, code highlighting, and a table of contents. Posts do not need arbitrary interactive components.

## Decision

Keep pure Markdown as the authoritative post source. Author through a text area with preview and a mobile formatting toolbar. Render with remark and rehype, and highlight code with Shiki on the server. Do not store MDX.

Rendered HTML may be cached or materialised after the hosting decision. Markdown remains the recovery and migration source.

## Trade-offs

- **Gain**: Content stays portable, reviewable, and independent of the editor runtime.
- **Accept**: The project must implement preview parity, sanitisation, cursor-safe toolbar actions, and mobile keyboard tests.
- **Reversal**: Medium — rich text can import Markdown, but round-trip fidelity needs migration tests.

## Rejected alternatives

- Rich text — adds a larger runtime, document schema, and sanitisation surface.
- MDX — couples stored content to executable application code.
