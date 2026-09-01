# 0004. Better Auth with email OTP

- **Status**: Accepted
- **Date**: 2026-08-31
- **Requirements**: FR-AUTH-01, FR-AUTH-04, FR-AUTH-05, FR-ADMIN-01, NFR-CN-04

## Context

v1 needs one owner account and protected admin routes. v1.5 extends the same system to visitors. Mainland mail providers make a six-digit code safer than a magic link.

## Decision

Use Better Auth with email OTP and database-backed sessions. Resend delivers six-digit codes. v1 enables only the existing owner account; visitor email and GitHub login remain in v1.5.

Store rate limits and one-time-code state durably. Never depend on in-memory counters in a serverless runtime. Release requires successful delivery tests to QQ Mail and 163 Mail.

## Trade-offs

- **Gain**: One authentication system covers owner and visitor releases with native email OTP.
- **Accept**: Bootstrap must validate the Better Auth release, Prisma adapter, schema, Next.js compatibility, delivery, and abuse controls.
- **Reversal**: High — account tables, sessions, guards, and login UI must migrate together.

## Rejected alternatives

- Auth.js — email OTP requires custom work.
- Custom authentication — makes the project own session and token security.
