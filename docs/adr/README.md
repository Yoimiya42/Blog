# Architecture Decision Records

One record per significant technical decision. Filename format `NNNN-short-title.md`, numbered sequentially.

## Rules

1. **Append only.** A reversed decision produces a new record; the old file is not edited beyond setting its status to `Superseded by NNNN`.
2. A decision is significant when it is broad in impact, hard to reverse, or genuinely contested. Prisma versus Drizzle qualifies; `map` versus `for` does not.
3. Keep writing to 20 minutes. If the alternatives section is hard to fill, the decision is not yet understood.

Template: `template.md`.

## Index

| ID | Title | Status | Date |
|---|---|---|---|
| [0001](0001-fullstack-over-static.md) | Full-stack application over a static site | Accepted | 2026-08-29 |
| [0002](0002-unified-item-table.md) | One shared table for all life-list categories | Accepted | 2026-08-29 |
| [0003](0003-china-accessibility.md) | Mainland China accessibility as a hard constraint | Accepted | 2026-08-29 |
| [0004](0004-better-auth-email-otp.md) | Better Auth with email OTP | Accepted | 2026-08-31 |
| [0005](0005-markdown-authoring.md) | Pure Markdown authoring | Accepted | 2026-08-31 |
| [0006](0006-hosting-platform-spike.md) | Hosting platform validation spike | Accepted | 2026-08-31 |
