# 0008. Use Vercel previews before production host selection

- **Status**: Superseded by 0009
- **Date**: 2026-09-03
- **Requirements**: NFR-CN-05, NFR-CN-07, NFR-CN-08, NFR-CN-10
- **Supersedes**: ADR-0006 development sequencing

## Context

ADR-0006 required a dual-platform spike before product work. Its local evidence is useful, but no candidate deployment exists and the gate delays the representative workloads needed for comparison.

## Decision

Use Git-based Vercel Preview Deployments as the current feedback environment. Deploy feature branches for review and build representative features before reassessing production hosting.

Vercel is the first platform, not a permanent commitment. Evaluate Vercel, Cloudflare Workers, and Docker on Linux after database, authentication, media, and rendering workloads exist. Defer cross-platform work until then.

Use standard Next.js and Node.js interfaces where practical. Do not add speculative portability abstractions. Preview URLs are development evidence only; production still requires custom-domain and mainland China validation.

## Trade-offs

- **Gain**: Product work receives live deployment feedback now.
- **Accept**: Hosting comparison and production selection move later.
- **Reversal**: Low — preview deployment does not define the data or application architecture.

## Rejected alternatives

- Complete the dual-platform spike first — delays representative workloads.
- Select Vercel permanently now — production evidence is insufficient.
