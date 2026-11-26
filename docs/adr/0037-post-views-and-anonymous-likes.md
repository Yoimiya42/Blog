# 0037. Post views and anonymous likes

- **Status**: Accepted
- **Date**: 2026-11-25
- **Requirements**: FR-BLOG-19, FR-BLOG-20, FR-MOMENT-08
- **Supersedes**: ADR-0017 for anonymous post likes only

## Context

The owner wants view and like counts on post cards in v1. ADR-0017 defers every visitor-written feature to v2.5. Likes write visitor data, but need no account, moderation, or text.

## Decision

- **Views**: the post page calls a Server Action once after load; it adds one to `post_view.count`. Every opening counts. Nothing about the visitor is stored. Counts live outside `post`, so a view never rewrites the post row or changes `updated_at`.
- **Likes**: anonymous and reversible. A Server Action toggles one `reaction` row keyed by `target_type`, `target_id`, `visitor_id`, and `kind`. `visitor_id` is a random `httpOnly` cookie set on the first like only. Counts are derived with `count(*)`.
- `reaction` has no foreign key, so moments reuse it (ADR-0036).
- Likes share the `rate_limit` table under a `post-like:` key holding a SHA-256 hash of the IP: 30 per minute.
- Visitor accounts, comments, and moderation stay in v2.5.

## Trade-offs

- **Gain**: Counts without accounts, third-party analytics, or a consent banner.
- **Accept**: Views include reloads and the owner; a visitor who clears cookies can like again.
- **Reversal**: Low — two additive tables.

## Rejected alternatives

- `view_count` on `post`: every view would rewrite the row with its content.
- Counting views during the server render: prefetches and crawlers would count.
