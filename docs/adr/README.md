# Architecture Decision Records

One record per significant technical decision. Filename format `NNNN-short-title.md`, numbered sequentially.

## Rules

1. **Append only.** A reversed decision produces a new record; the old file is not edited beyond setting its status to `Superseded by NNNN`.
2. Create an ADR only for a technical decision that is broad in impact, hard to reverse, or genuinely contested. Keep simple product decisions in `PRD.md`.
3. Target 150 words and cap records at 200 words by default.
4. Hosting, authentication, security, data integrity, and evidence-heavy validation may exceed the cap when the extra detail affects implementation or release safety.
5. State the decision directly. Summarise trade-offs. Record each rejected alternative in one line only when it was genuinely considered. Do not expand separate pros and cons lists.

Template: `template.md`.

## Index

| ID | Title | Decision summary | Status | Date |
|---|---|---|---|---|
| [0001](0001-fullstack-over-static.md) | Full-stack application over a static site | Use one full-stack application; later ADRs own stack details | Accepted | 2026-08-29 |
| [0002](0002-unified-item-table.md) | One shared table for all life-list categories | Use one typed item table with display-only metadata in JSON | Accepted | 2026-08-29 |
| [0003](0003-china-accessibility.md) | Mainland China accessibility as a hard constraint | Block release on mainland reachability and avoid blocked dependencies | Accepted | 2026-08-29 |
| [0004](0004-better-auth-email-otp.md) | Better Auth with email OTP | Use email OTP and database sessions for the v1 owner | Accepted | 2026-08-31 |
| [0005](0005-markdown-authoring.md) | Pure Markdown authoring | Keep Markdown authoritative and render it on the server | Accepted | 2026-08-31 |
| [0006](0006-hosting-platform-spike.md) | Hosting platform validation spike | Required a dual-platform spike before product development | Superseded | 2026-08-31 |
| [0007](0007-default-locale-urls.md) | English root with prefixed translations | Keep English unprefixed and prefix each future locale | Accepted | 2026-09-01 |
| [0008](0008-vercel-previews-before-host-selection.md) | Vercel previews before host selection | Use Vercel previews now and reassess production hosting after representative features | Accepted | 2026-09-03 |
