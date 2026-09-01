# 0006. Hosting platform validation spike

- **Status**: Accepted
- **Date**: 2026-08-31
- **Requirements**: NFR-CN-05, NFR-CN-06, NFR-CN-08, NFR-CN-09, NFR-CN-10, PRD section 6.2
- **Supersedes**: ADR-0001 deployment platform and region only

## Context

Vercel and Cloudflare Workers with OpenNext have different runtime, database, media, cost, and regional behaviour. Neither guarantees project compatibility or mainland reachability without deployment evidence.

## Decision

Require a representative vertical slice on both platforms before selecting a host or adding provider-specific application code. No platform is accepted by this ADR.

The spike must validate:

- Next.js 16 SSR, Better Auth with durable limits, and Prisma with Neon Singapore.
- R2 signed operations and custom-domain delivery.
- Mobile HEIC handling, orientation, GPS removal, limits, quality, and server versus browser processing.
- Preview and production domains, cold and warm latency, errors, CPU, bundle size, monthly cost, and UK/mainland tests.

A follow-up ADR selects the host, image pipeline, and Prisma release from the evidence.

## Trade-offs

- **Gain**: High-impact platform choices use project-specific evidence.
- **Accept**: The spike duplicates a small deployment and delays provider automation.
- **Reversal**: Low before provider-specific code ships.

## Rejected alternatives

- Managed virtual server — exceeds the v1 operations budget.
