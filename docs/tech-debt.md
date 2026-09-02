# Technical debt ledger

Records accepted compromises only, not ideas or future features. Every entry needs a GitHub Issue; the Issue tracks live status, this table keeps the long-term context and links.

| ID | Location | Compromise and reason | Impact | Repayment trigger | Issue |
|---|---|---|---|---|---|
| TD-001 | `package.json` | Prisma 7.10 pins vulnerable `deepmerge-ts` and `mysql2` releases. Root overrides retain the selected Prisma major while using patched transitive versions. | Overrides can expose untested upstream combinations. The full gate covers each dependency change. | Prisma ships patched transitive dependencies. | [#26](https://github.com/Yoimiya42/Blog/issues/26) |

<!-- Append a row when taking on debt. Delete the row once repaid; history stays in the closed Issue and in Git. -->
