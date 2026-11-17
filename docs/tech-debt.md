# Technical debt ledger

Records accepted compromises only, not ideas or future features. Every entry needs a GitHub Issue; the Issue tracks live status, this table keeps the long-term context and links.

| ID | Location | Compromise and reason | Impact | Repayment trigger | Issue |
|---|---|---|---|---|---|
| TD-002 | Workers plan, public routes | Production stays on Workers Free after the public blog ships although every measured route exceeds the 10 ms CPU limit at the median (14 to 54 ms, maximum 156 ms). See ADR-0019 | Routes rely on undocumented tolerance of CPU overruns; a visitor may see error 1102 | First exceeded-CPU outcome in production Workers Logs, or public promotion of the site | [#58](https://github.com/Yoimiya42/Blog/issues/58) |
| TD-003 | Release gates, mainland China | Mainland tests are recorded, not required to pass, so the build is not blocked on a mainland tester. See ADR-0020 | v1 may ship with mainland load failures undetected | A mainland visitor reports a failure, or the site is promoted to a mainland audience | [#19](https://github.com/Yoimiya42/Blog/issues/19) |

<!-- Append a row when taking on debt. Delete the row once repaid; history stays in the closed Issue and in Git. -->
