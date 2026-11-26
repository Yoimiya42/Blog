# 0036. Moment data model and composer

- **Status**: Accepted
- **Date**: 2026-11-25
- **Requirements**: FR-MOMENT-01, FR-MOMENT-02, FR-MOMENT-08, FR-ADMIN-11
- **Supersedes**: none

## Context

Moments are short status updates: plain text, up to nine images, no title. The owner wants to post them faster than a blog post. Likes and comments come later with FR-SOCIAL and must not force a table rebuild.

## Decision

- A `moment` table holds `body`, `created_at`, `updated_at`, and `deleted_at`. It has no status: saving publishes. `updated_at` is the concurrency token, as for `post`.
- A `moment_media` table orders images by `position`, with foreign keys to `moment` and `media`. The media reference scan (ADR-0025) also queries it.
- No interaction columns. Comments and reactions use the polymorphic `targetType` plus `targetId` tables in PRD section 5; counts are derived. The feed reserves a disabled footer slot.
- The composer is a plain textarea, not TipTap. Images upload through `POST /api/media` (ADR-0024) before submit; the Server Action sends the body and ordered media ids. The service accepts live media only.
- `/moments` renders in the formal blog shell until OQ-02 defines the personal shell.

## Trade-offs

- **Gain**: Small schema with database-enforced image references; no editor bundle in the composer.
- **Accept**: An image uploaded and then removed before posting stays in the library.
- **Reversal**: Low — light Markdown, place, and mood are added columns.

## Rejected alternatives

- Media ids as a JSON array on `moment`: no foreign keys, and the reference scan must parse every row.
- `post` with a type column: posts require a slug, a title, and TipTap content.
