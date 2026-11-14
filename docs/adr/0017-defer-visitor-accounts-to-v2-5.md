# 0017. Defer visitor accounts and interaction to v2.5

- **Status**: Accepted
- **Date**: 2026-11-14
- **Requirements**: FR-AUTH-01 to FR-AUTH-03, FR-AUTH-06, FR-SOCIAL-01 to FR-SOCIAL-05, FR-SOCIAL-09, FR-ADMIN-14
- **Supersedes**: ADR-0004's "visitor email and GitHub login remain in v1.5" timing only

## Context

ADR-0004 opens login to visitors in v1.5, and the PRD placed comments in v1.5 and visitor ratings in v2. The owner judged visitor accounts and visitor-written content too early: they add abuse controls, moderation, notification, and account deletion before the owner publishing surfaces exist.

## Decision

v1.5 and v2 contain owner publishing only. v2.5 opens login to visitors and ships every visitor-written feature: registration, GitHub and Google login, comments, visitor ratings and short reviews, anti-spam, comment notification and moderation, and self-service account deletion.

The authentication design in ADR-0004 is unchanged. The mainland mailbox delivery tests in ADR-0016 block v2.5.

## Trade-offs

- **Gain**: v1.5 and v2 ship without moderation, abuse, or GDPR deletion work.
- **Accept**: The site has no visitor feedback channel until v2.5.
- **Reversal**: Low — version tags change; no code depends on the order.
