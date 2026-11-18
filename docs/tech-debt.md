# Technical debt ledger

Records accepted compromises only, not ideas or future features. Every entry needs a GitHub Issue; the Issue tracks live status, this table keeps the long-term context and links.

| ID | Location | Compromise and reason | Impact | Repayment trigger | Issue |
|---|---|---|---|---|---|
| TD-002 | Workers plan, public routes | Production stays on Workers Free after the public blog ships although every measured route exceeds the 10 ms CPU limit at the median (14 to 54 ms, maximum 156 ms). See ADR-0019 | Routes rely on undocumented tolerance of CPU overruns; a visitor may see error 1102 | First exceeded-CPU outcome in production Workers Logs, or public promotion of the site | [#58](https://github.com/Yoimiya42/Blog/issues/58) |
| TD-003 | Release gates, mainland China | Mainland tests are recorded, not required to pass, so the build is not blocked on a mainland tester. See ADR-0020 | v1 may ship with mainland load failures undetected | A mainland visitor reports a failure, or the site is promoted to a mainland audience | [#19](https://github.com/Yoimiya42/Blog/issues/19) |
| TD-004 | `src/features/media/upload/` | PNG and WebP uploads lose their whole EXIF chunk, orientation included; JPEG MakerNote data is kept and not inspected for coordinates. Accepted to ship GPS removal for the common case | A rotated PNG or WebP displays unrotated; an unknown vendor field could keep a location | A rotated PNG or WebP displays wrongly, or a device writes coordinates outside the GPS IFD | [#72](https://github.com/Yoimiya42/Blog/issues/72) |
| TD-005 | `POST /api/media` on Workers Free | Upload validation and GPS stripping run in the Worker, which reads the whole body. A 27.5 MB JPEG used 204 ms CPU against the 10 ms Free limit, above the 156 ms behind ADR-0019. Accepted under the same policy as TD-002 | A large upload may fail with error 1102; the owner retries or exports a smaller file | First exceeded-CPU outcome on `/api/media`, or the move to Workers Paid under #58 | [#58](https://github.com/Yoimiya42/Blog/issues/58) |

<!-- Append a row when taking on debt. Delete the row once repaid; history stays in the closed Issue and in Git. -->
