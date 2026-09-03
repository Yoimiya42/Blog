# Technical debt ledger

Records accepted compromises only, not ideas or future features. Every entry needs a GitHub Issue; the Issue tracks live status, this table keeps the long-term context and links.

| ID | Location | Compromise and reason | Impact | Repayment trigger | Issue |
|---|---|---|---|---|---|
| TD-001 | Workers platform validation | Representative request CPU was deferred so CMS work can start against real D1, authentication, and rendering workloads | Workers Free suitability is not proven for the completed application | Measure production-candidate routes before the v1 release decision or any Workers Paid request | [#19](https://github.com/Yoimiya42/Blog/issues/19) |

<!-- Append a row when taking on debt. Delete the row once repaid; history stays in the closed Issue and in Git. -->
