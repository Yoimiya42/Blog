# 0003. Mainland China accessibility as a hard constraint

- **Status**: Accepted
- **Date**: 2026-08-29
- **Requirements**: NFR-CN-01 to NFR-CN-10

## Context

The owner is in the UK, but important visitors are in mainland China. Blocked scripts, fonts, provider domains, and rewritten email links can make the site or login unusable.

## Decision

Deploy outside mainland China without ICP filing, while treating mainland reachability as a release gate. Use custom application and media domains. Self-host fonts. Do not depend on Google services or another blocked runtime resource. Use six-digit email codes instead of magic links. Validate every new third-party dependency and CDN from a mainland network before release.

Hosting platform and region follow the ADR-0006 validation process.

## Trade-offs

- **Gain**: One deployment can serve UK and mainland visitors without mainland hosting obligations.
- **Accept**: Mainland access targets usable, not locally accelerated, performance and requires recurring real-network tests.
- **Reversal**: High — blocked dependencies can spread through rendering, authentication, and delivery paths.

## Rejected alternatives

- Ignore mainland constraints — violates a primary audience requirement.
- Mainland hosting or dual deployment — adds ICP, regulatory, and operational costs beyond project scope.
