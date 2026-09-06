# Technical debt ledger

Records accepted compromises only, not ideas or future features. Every entry needs a GitHub Issue; the Issue tracks live status, this table keeps the long-term context and links.

| ID | Location | Compromise and reason | Impact | Repayment trigger | Issue |
|---|---|---|---|---|---|
| TD-001 | Workers platform validation | Representative request CPU was deferred so CMS work can start against real D1, authentication, and rendering workloads | Request CPU and cold-start cost are unmeasured on the real platform; ADR-0011 chose Workers Paid from local measurements alone | Measure production-candidate routes on Workers before the v1 release decision | [#19](https://github.com/Yoimiya42/Blog/issues/19) |
| TD-002 | Drizzle Kit 0.31.10 | The latest stable release includes a vulnerable legacy esbuild loader; downgrading would discard required current migrations support | Local development tooling could expose responses if its server is opened to an untrusted browser; production dependencies are unaffected | Upgrade after a stable release removes `@esbuild-kit/esm-loader`; do not run Drizzle Studio before then | [#37](https://github.com/Yoimiya42/Blog/issues/37) |

<!-- Append a row when taking on debt. Delete the row once repaid; history stays in the closed Issue and in Git. -->
