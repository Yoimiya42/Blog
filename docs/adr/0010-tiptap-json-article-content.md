# 0010. TipTap JSON article content

- **Status**: Accepted
- **Date**: 2026-09-03
- **Requirements**: FR-BLOG-02, FR-BLOG-03, FR-BLOG-05, FR-BLOG-07, FR-BLOG-13, FR-ADMIN-03, FR-ADMIN-09
- **Supersedes**: ADR-0005 and ADR-0009's content-source clause

## Context

Articles need structured media and custom layouts. Markdown requires project-specific syntax and ambiguous migrations.

## Decision

Store article bodies as versioned TipTap JSON in D1 `TEXT` through Drizzle JSON mode. This is the only authoritative representation. Validate writes and map allowlisted nodes to React components.

Schema v1 contains prose, headings, lists, blockquotes, links, formatting, media-backed images, and code blocks. Later blocks require a version and migration. Nodes contain data, not code.

HTML and Markdown are derived exports, never write sources. TipTap packages are bundled; public rendering cannot depend on external TipTap services or assets.

## Trade-offs

- **Gain**: Explicit nodes support custom presentation without invented syntax.
- **Accept**: Content is coupled to the project schema and renderer.
- **Reversal**: High — custom nodes need format-specific export rules.

## Rejected alternatives

- Markdown — custom blocks create an ad hoc second schema.
- Dual Markdown and JSON — authoritative copies drift.
- MDX — stored components expand the trust surface.
