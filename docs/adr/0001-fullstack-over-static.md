# 0001. Full-stack application over a static site

- **Status**: Accepted
- **Date**: 2026-08-29
- **Requirements**: FR-ADMIN-*, FR-AUTH-*, FR-SOCIAL-*
- **Scope**: Application architecture only; later ADRs own stack details

## Context

Mobile publishing, visitor accounts, and future interactions require server-side state. A static site would need a separate backend and duplicate content workflows.

## Decision

Use one full-stack application with a relational database and a mobile-first owner admin. The same backend owns publishing, authentication, and future interactions. Current framework, authentication, storage, and deployment choices are defined by later ADRs and `architecture.md`.

## Trade-offs

- **Gain**: One system supports immediate publishing and stateful features.
- **Accept**: More implementation, security, backup, and operational responsibility than a static site.
- **Reversal**: Low — export public content to Markdown and generate a static site.

## Rejected alternatives

- Static generation with Git content — poor mobile publishing and no stateful features.
- Git-based or third-party CMS — still requires a separate backend and creates platform coupling.
