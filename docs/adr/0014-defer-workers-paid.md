# 0014. Defer Workers Paid until code highlighting ships

- **Status**: Accepted
- **Date**: 2026-11-10
- **Requirements**: FR-BLOG-03, PRD 6.6
- **Supersedes**: ADR-0011's "run production on Workers Paid" timing only

## Context

ADR-0011 requires Workers Paid because first-use Shiki grammar setup exceeds the 10 ms per-request CPU limit on Workers Free. The re-planned roadmap ships the hardcoded homepage and owner login before any public route renders code. Those routes do not highlight.

## Decision

Run production on Workers Free until the public blog ships. Move production to Workers Paid before the first public route that renders a code block is released, in milestone M2. The engine choice in ADR-0011 is unchanged.

## Trade-offs

- **Gain**: No hosting cost while production serves only the homepage and login.
- **Accept**: Login and D1 requests run under the free CPU limit without production measurement. A CPU-limit error on those routes triggers the upgrade early.
- **Reversal**: Low — the plan changes in the Cloudflare dashboard without a code change.
