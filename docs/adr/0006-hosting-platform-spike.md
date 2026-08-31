# 0006. Hosting platform validation spike

- **Status**: Proposed
- **Date**: 2026-08-31
- **Requirements**: NFR-CN-05, NFR-CN-06, NFR-CN-08, NFR-CN-09, NFR-CN-10, PRD section 6.2

## Context

ADR-0001 named Vercel before the runtime, authentication, and image requirements were validated. Cloudflare Workers with OpenNext is now a candidate. The choice affects Next.js compatibility, Prisma connectivity, image processing, preview deployments, annual cost, and latency in the UK and mainland China. Neither provider guarantees mainland reachability without a custom domain and real-network tests.

## Options considered

### Vercel

Pros: Native Next.js deployment, preview environments, and a conventional Node.js image pipeline.

Cons: The preferred free tier and regional behaviour need validation. Mainland performance remains unproven.

### Cloudflare Workers with OpenNext

Pros: Direct R2 integration, broad edge placement, and a low fixed paid baseline.

Cons: Adapter support and runtime restrictions need validation. CPU limits and image-processing strategy may require different implementation choices.

### Managed virtual server

Pros: Full Node.js control and predictable runtime compatibility.

Cons: Adds patching, process supervision, backup, and deployment operations beyond the v1 maintenance target.

## Decision

No hosting platform is accepted yet. Build one representative vertical slice and deploy it to Vercel and Cloudflare Workers before application implementation depends on either platform.

The spike must verify:

- Next.js 16 production build and server rendering.
- Better Auth owner email OTP and durable rate limiting.
- The selected Prisma release with Neon Singapore.
- R2 upload, custom-domain delivery, and signed operations.
- Mobile upload with HEIC handling, orientation correction, GPS EXIF removal, size limits, and output quality.
- Server-side `sharp` and browser preprocessing where supported.
- Preview and production custom domains.
- Cold and warm TTFB, error rate, CPU use, bundle size, and estimated monthly cost.
- UK and mainland China tests on the same representative routes.

An accepted follow-up ADR will select the host and supersede the deployment details in ADR-0001. The image pipeline and Prisma major version remain provisional until this spike passes.

## Consequences

**Benefits**: The most expensive platform choice is based on project-specific evidence. Runtime constraints remain visible before implementation spreads them through the codebase.

**Costs accepted**: The spike duplicates a small deployment and delays provider-specific automation.

**Cost of reversing**: Low before the follow-up ADR. Higher after provider-specific image, caching, and deployment code ships.
