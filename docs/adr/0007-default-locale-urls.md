# 0007. English root with prefixed translations

- **Status**: Accepted
- **Date**: 2026-09-01
- **Requirements**: FR-HOME-09, OQ-05

## Context

The v1 site is English-only. Future content may include Simplified Chinese, Traditional Chinese, Japanese, and French. Public URLs must remain stable after launch. The same convention must work on the formal host and the personal subdomain without browser-dependent routing.

## Options considered

### Unprefixed English with prefixed translations

Pros:
- Keeps the primary academic and career URL concise.
- Preserves all v1 English URLs when more locales are added.
- Gives every non-default locale an explicit, indexable URL.

Cons:
- The default locale is structurally asymmetric.
- Routing must support an optional locale segment.

### Prefix every locale

Pros:
- Gives every locale the same route structure.
- Simplifies generic locale parsing and switching.

Cons:
- Moves the primary homepage to `/en`.
- Requires a root redirect and lengthens every English URL.

### Locale subdomains or implicit negotiation

Pros:
- Separates locale deployments or selects a language automatically.

Cons:
- Multiplies DNS, deployment, cookie, cache, and canonical URL concerns.
- Browser-dependent responses make sharing, caching, and indexing less predictable.

## Decision

English is the primary locale and uses unprefixed URLs. Future locales use lowercase BCP 47 path prefixes. Initial reserved prefixes are `/zh-hans`, `/zh-hant`, `/ja`, and `/fr`.

The convention applies independently to `fangmingluan.com` and `life.fangmingluan.com`. The application does not redirect from browser language settings. A visitor changes locale explicitly. Translations may be published independently and use an internal association when related; matching slugs are not required.

## Consequences

**Benefits**:
- The formal English homepage remains available at the apex URL.
- Adding a locale does not migrate existing English URLs.
- Search engines and visitors receive deterministic locale URLs.

**Costs accepted**:
- Default-locale routes differ from translated routes.
- Locale-aware navigation and metadata must account for the unprefixed default.

**Cost of reversing**:
- Moving English under `/en` would require permanent redirects, canonical updates, sitemap changes, and inbound-link migration.
