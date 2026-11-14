# 0018. Server Actions for admin mutations

- **Status**: Accepted
- **Date**: 2026-11-14
- **Requirements**: FR-ADMIN-01, FR-ADMIN-02, PRD section 6.4 CSRF protection

## Context

Issue #12 adds the first owner mutations. The transport must authorise on the server, resist CSRF, and run on vinext and Workers. No admin mutation exists yet, so the choice sets the pattern for every later admin form.

## Decision

Admin forms submit through React Server Actions.

- Actions live in `features/<module>/server/*.actions.ts` and are imported only by that module's components.
- Each action calls `requireOwner()` first, then a service method. Actions hold no business rules.
- Actions return typed field errors for `useActionState`; success redirects or revalidates.
- CSRF relies on the framework's `Origin` check for action requests, which vinext implements, plus the `SameSite=Lax` session cookie.

Better Auth keeps its own route handler. Public and machine-facing endpoints remain route handlers.

## Trade-offs

- **Gain**: No hand-written endpoints or client fetch code. Forms submit without client JavaScript.
- **Accept**: Action endpoints are framework-internal and not callable by other clients. Behaviour depends on vinext's implementation.
- **Reversal**: Low — actions are thin; a route handler can call the same service method.

## Rejected alternatives

- Route handlers with client `fetch` — needs explicit CSRF tokens and duplicate request parsing for no v1 benefit.
