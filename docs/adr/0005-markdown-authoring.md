# 0005. Pure Markdown authoring

- **Status**: Superseded by 0010
- **Date**: 2026-08-31
- **Requirements**: FR-BLOG-02, FR-BLOG-03, FR-BLOG-05, FR-BLOG-06, FR-ADMIN-03, FR-ADMIN-09

## Context

v1 needs fast mobile publishing, preview, code highlighting, and a table of contents. Content must remain portable and safe to render. The owner does not need arbitrary interactive components inside posts.

## Options considered

### Pure Markdown with a text editor

Pros: Portable source, small editor surface, predictable sanitisation, and simple migrations.

Cons: Formatting syntax is visible and split preview needs deliberate mobile design.

### Rich-text editor

Pros: Direct visual editing and familiar controls.

Cons: Larger client bundle, complex document schema, and more migration and sanitisation work.

### MDX

Pros: Supports interactive React components in posts.

Cons: Expands the trusted execution surface and couples stored content to application code.

## Decision

Store pure Markdown as the authoritative post source. Use a text area with a preview toggle and a mobile formatting toolbar. Render through remark and rehype. Highlight code with Shiki on the server. Do not support MDX in stored content.

Rendered HTML may be cached or materialised after the hosting decision. Markdown remains the recovery and migration source.

## Consequences

**Benefits**: Content is portable, reviewable, and independent of an editor framework. Public pages need no editor runtime.

**Costs accepted**: The project must implement preview parity, cursor-safe toolbar actions, sanitisation, and mobile keyboard tests.

**Cost of reversing**: A rich-text editor can import Markdown, but round-trip fidelity and stored-content migration require explicit testing.
