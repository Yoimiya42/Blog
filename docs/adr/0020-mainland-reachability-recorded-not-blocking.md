# 0020. Mainland reachability is recorded, not blocking

- **Status**: Accepted
- **Date**: 2026-11-17
- **Requirements**: NFR-CN-06, NFR-CN-07, NFR-CN-10
- **Supersedes**: ADR-0003's release blocking on mainland tests and its per-dependency reachability confirmation

## Context

ADR-0003 made mainland reachability a release blocker and required confirmation before any third-party dependency. The owner now ranks completing the v1 build above mainland verification. The cheap preventive rules in ADR-0003 cost nothing to keep.

## Decision

Keep the preventive rules: no Google services, custom domains only, email-code login, and no first paint that depends on a third party (NFR-CN-01 to NFR-CN-06, NFR-CN-08, NFR-CN-09).

Downgrade verification. Mainland tests are recorded, not required to pass. A new third-party dependency or CDN still needs an ADR. Its mainland reachability is recorded when known; a known block rejects the dependency, but missing evidence does not.

## Trade-offs

- **Gain**: Feature work, including Cloudflare Images, proceeds without waiting for a mainland tester.
- **Accept**: v1 may ship with unverified mainland behaviour. Recorded as TD-003.
- **Reversal**: Low — restore the gate in the PRD and ROADMAP; no code depends on it.
