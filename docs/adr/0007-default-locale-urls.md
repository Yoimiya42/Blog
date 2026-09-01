# 0007. English root with prefixed translations

- **Status**: Accepted
- **Date**: 2026-09-01
- **Requirements**: FR-HOME-09, OQ-05

## Context

v1 is English-only. Future Simplified Chinese, Traditional Chinese, Japanese, and French content needs stable, explicit URLs on the formal and personal hosts.

## Decision

Keep English unprefixed. Use lowercase BCP 47 prefixes for future locales: `/zh-hans`, `/zh-hant`, `/ja`, and `/fr`. Apply the same convention to `fangmingluan.com` and `life.fangmingluan.com`.

Never redirect from browser language settings. Visitors change locale explicitly. Translations may publish independently and use an internal association; matching slugs are not required.

## Trade-offs

- **Gain**: The primary homepage stays at the apex, and future locales do not migrate English URLs.
- **Accept**: Default-locale routing is asymmetric and metadata must handle an unprefixed default.
- **Reversal**: High — moving English to `/en` requires permanent redirects, canonical and sitemap updates, and inbound-link migration.

## Rejected alternatives

- Prefix every locale — lengthens English URLs and requires a root redirect.
- Locale subdomains or implicit negotiation — complicates deployment, caching, cookies, sharing, and indexing.
