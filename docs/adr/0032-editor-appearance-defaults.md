# 0032. Editor appearance defaults and per-post override

- **Status**: Accepted
- **Date**: 2026-11-24
- **Requirements**: FR-ADMIN-26, FR-ADMIN-27
- **Supersedes**: 0031, per-owner scope only

## Context

ADR-0031 stored one background per owner, so a change in one post changed all of them. The owner wants a default set in admin settings and per-post changes that win on reopen.

## Decision

- `editor_background` becomes the owner default, edited at `/admin/settings`.
- Migration `0009` adds `post_editor_background`: one row per post with `media_id` and `opacity`. A row exists only after the editor changes that post; Reset to default deletes it.
- The edit page uses the post row, else the default, and reports which.
- The row lives outside `post`, so a background change never moves `post.updated_at`, the autosave version token.
- Later appearance options become columns on both tables with the same precedence.
- ADR-0031 still governs rendering, glass, contrast, and deleted media. The library flags images used by the default or any post.

## Trade-offs

- **Gain**: Set once, override where it matters; no autosave conflicts.
- **Accept**: A second table and two update paths.
- **Reversal**: Low — drop the per-post table to return to ADR-0031.

## Rejected alternatives

- Columns on `post` — every change would bump the version token and conflict with autosave.
