# 0009. Adopt Cloudflare Workers, D1, and Drizzle

- **Status**: Accepted
- **Date**: 2026-09-03
- **Requirements**: NFR-CN-05 to NFR-CN-10, FR-AUTH-05, FR-ADMIN-01
- **Supersedes**: ADR-0001 stack details, ADR-0004 Prisma adapter assumption, and ADR-0008

## Context

The application has no committed ORM schema, migrations, or production data. The owner selected Cloudflare before Issue #7 made the previous stack expensive to reverse.

## Decision

Deploy Next.js 16 to Cloudflare Workers. Use D1 as the relational source of truth and Drizzle as the ORM. Keep Better Auth, R2, pure Markdown, and the repository boundary.

Issue #29 validates vinext first because it is Cloudflare's current recommendation. Use OpenNext only when a recorded compatibility gap blocks vinext.

Separate local, test, preview, and production D1 databases. Commit generated SQL migrations and apply them through Wrangler. Only repositories may access Drizzle.

Start on Workers Free. Measure bundle size, startup time, and representative CPU time before requesting Workers Paid. Retain Vercel as a rollback path until the Workers preview passes. Production still requires custom domains and mainland China tests.

## Trade-offs

- **Gain**: D1 and R2 use native Workers bindings. No connection pool is required.
- **Accept**: D1 uses SQLite semantics, has platform limits, and increases Cloudflare coupling.
- **Reversal**: Medium — repositories isolate database access, but schema and deployment operations must migrate together.

## Rejected alternatives

- Prisma with Neon — adds a separate service and connection management without a migration benefit.
- TanStack Start — changes the application framework beyond this transition.
