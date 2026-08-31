# 0004. Better Auth with email OTP

- **Status**: Accepted
- **Date**: 2026-08-31
- **Requirements**: FR-AUTH-01, FR-AUTH-04, FR-AUTH-05, FR-ADMIN-01, NFR-CN-04

## Context

v1 needs one owner account and protected admin routes. v1.5 extends login to visitors. The primary method must use a six-digit email code because mainland mail providers may rewrite or block magic links. The application is new, so no authentication migration is required.

## Options considered

### Auth.js

Pros: Established provider ecosystem and broad Next.js adoption.

Cons: Email OTP needs custom work. The selected release line has had prolonged pre-release status.

### Better Auth

Pros: Native email OTP support, database sessions, and a direct Next.js integration.

Cons: Younger ecosystem and additional release compatibility checks.

### Custom authentication

Pros: Small feature surface for an owner-only v1.

Cons: The project would own session rotation, token security, expiry, abuse controls, and future provider integration.

## Decision

Use Better Auth with its email OTP flow and database-backed sessions. Resend sends six-digit codes. v1 enables the owner account only. Visitor email and GitHub login remain in v1.5.

Rate limits and one-time-code state must use durable storage. In-memory counters are not valid in a serverless runtime. QQ Mail and 163 Mail delivery tests block release.

## Consequences

**Benefits**: One authentication system covers owner and visitor releases. The primary flow meets the mainland accessibility constraint.

**Costs accepted**: Bootstrap must verify the selected Better Auth release, Prisma adapter, session schema, and Next.js 16 compatibility. Email delivery and abuse controls need integration tests.

**Cost of reversing**: Session and account tables, route guards, and login UI must migrate together.
