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
| [0003](0003-china-accessibility.md) | Mainland China accessibility as a hard constraint | Block release on mainland reachability and avoid blocked dependencies | Accepted; release blocking and per-dependency confirmation superseded by 0020 | 2026-08-29 |
| [0004](0004-better-auth-email-otp.md) | Better Auth with email OTP | Use email OTP and database sessions for the v1 owner | Accepted; delivery-test timing superseded by 0016; visitor timing superseded by 0017 | 2026-08-31 |
| [0005](0005-markdown-authoring.md) | Pure Markdown authoring | Keep Markdown authoritative and render it on the server | Superseded | 2026-08-31 |
| [0006](0006-hosting-platform-spike.md) | Hosting platform validation spike | Required a dual-platform spike before product development | Superseded | 2026-08-31 |
| [0007](0007-default-locale-urls.md) | English root with prefixed translations | Keep English unprefixed and prefix each future locale | Accepted | 2026-09-01 |
| [0008](0008-vercel-previews-before-host-selection.md) | Vercel previews before host selection | Use Vercel previews now and reassess production hosting after representative features | Superseded by 0009 | 2026-09-03 |
| [0009](0009-cloudflare-workers-d1-drizzle.md) | Cloudflare Workers, D1, and Drizzle | Use Workers with D1; ADR-0012 supersedes the Drizzle decision | Accepted; Drizzle superseded by 0012 | 2026-09-03 |
| [0010](0010-tiptap-json-article-content.md) | TipTap JSON article content | Store versioned TipTap JSON in D1 as the only authoritative article body | Accepted; Drizzle detail superseded by 0012 | 2026-09-03 |
| [0011](0011-shiki-javascript-engine-workers-paid.md) | Shiki JavaScript engine and Workers Paid | Highlight on the server with Shiki's JavaScript regex engine and run production on Workers Paid | Accepted; Paid timing superseded by 0014 | 2026-09-05 |
| [0012](0012-sql-first-d1.md) | Handwritten SQL for D1 | Use versioned SQLite migrations and typed D1 prepared statements | Accepted | 2026-09-06 |
| [0013](0013-prettier-sql-formatting.md) | Prettier for SQLite migrations | Use a pinned SQLite parser in the existing Prettier workflow | Accepted | 2026-09-06 |
| [0014](0014-defer-workers-paid.md) | Defer Workers Paid until code highlighting ships | Keep production on Workers Free until the public blog ships | Superseded by 0019 | 2026-11-10 |
| [0015](0015-worker-previews-environment-isolation.md) | Worker Previews for preview and production isolation | Keep one Worker; bind previews to their own D1 and secrets through the `previews` block | Accepted | 2026-11-14 |
| [0016](0016-defer-cn-mailbox-delivery-tests.md) | Defer QQ Mail and 163 Mail delivery tests to visitor login | v1 verifies owner-mailbox delivery only; the visitor-login release carries the mainland mailbox tests | Accepted | 2026-11-14 |
| [0017](0017-defer-visitor-accounts-to-v2-5.md) | Defer visitor accounts and interaction to v2.5 | Keep v1.5 and v2 owner-only; open login and all visitor-written features in v2.5 | Accepted; anonymous post likes superseded by 0037 | 2026-11-14 |
| [0018](0018-server-actions-for-admin-mutations.md) | Server Actions for admin mutations | Submit admin forms through owner-guarded Server Actions that call the service layer | Accepted | 2026-11-14 |
| [0019](0019-keep-workers-free-after-blog-release.md) | Keep Workers Free after the public blog ships | Stay on Workers Free; an exceeded-CPU outcome or public promotion triggers Paid or cached HTML | Accepted | 2026-11-15 |
| [0020](0020-mainland-reachability-recorded-not-blocking.md) | Mainland reachability is recorded, not blocking | Keep the preventive mainland rules; record mainland tests instead of requiring them to pass | Accepted | 2026-11-17 |
| [0021](0021-v1-image-pipeline.md) | v1 image pipeline | Strip GPS on the server into GPS-clean R2 originals; resize with Cloudflare Images on delivery at fixed widths | Accepted; transform call decided by 0022 | 2026-11-17 |
| [0022](0022-image-source-access-and-transform-path.md) | Image transform path and source access | Transform through `cf.image` from an Access-protected source domain; check permissions before any cache for non-public media | Accepted | 2026-11-17 |
| [0023](0023-worker-entry-serves-media.md) | A custom Worker entry serves `/media` before vinext | `worker/index.ts` answers `/media` with year-long browser caching and delegates everything else to vinext | Accepted | 2026-11-17 |
| [0024](0024-image-upload-endpoint.md) | Image upload through the Worker entry | `POST /api/media` checks origin and owner before reading a raw body, then strips GPS in place | Accepted | 2026-11-17 |
| [0025](0025-media-deletion.md) | Media deletion and reference safety | Scan posts for references at delete time; confirm twice for referenced items; keep the row so saves still pass; publishing needs live media | Accepted; deletion order superseded by 0033 | 2026-11-18 |
| [0026](0026-admin-component-kit.md) | Admin component kit | Build admin UI from shadcn/ui in `src/components/ui` with Radix, cmdk, and Lucide; icon-first controls | Accepted; public-page exclusion superseded by 0034 | 2026-11-22 |
| [0027](0027-editor-side-code-highlighting.md) | Editor-side code highlighting with Shiki | Highlight editor code blocks in the browser with the server's Shiki theme and grammars, loaded per language | Accepted | 2026-11-22 |
| [0028](0028-cpp-code-blocks.md) | C++ code blocks with the C grammar | Add `cpp` to schema v1 as an additive language value, highlighted with the C grammar | Accepted | 2026-11-22 |
| [0029](0029-design-tokens.md) | Design tokens | One token vocabulary in `globals.css` for colour, radius, motion, and type; shells override values; a test bans raw palette classes | Accepted | 2026-11-22 |
| [0030](0030-blank-draft-on-new-post.md) | Blank draft on New post | New post creates or reuses a placeholder draft so autosave starts at once; publishing needs a real slug | Accepted | 2026-11-23 |
| [0031](0031-editor-background.md) | Editor background preference | Store one background and opacity tier per owner in D1; render it server-side with `:has()` glass whose opacity rises with the tier | Accepted; per-owner scope superseded by 0032 | 2026-11-23 |
| [0032](0032-editor-appearance-defaults.md) | Editor appearance defaults and per-post override | `editor_background` is the owner default; `post_editor_background` holds a post's own choice outside `post`, which wins when present | Accepted | 2026-11-24 |
| [0033](0033-delete-media-object-first.md) | Delete the media object before the row | Delete the R2 object, then mark the row; any failure is reported and the same delete retries | Accepted | 2026-11-24 |
| [0034](0034-public-controls-use-component-kit.md) | Public controls use the component kit | Public interactive controls use `src/components/ui` and lucide icons; content layout stays custom CSS | Accepted | 2026-11-24 |
| [0035](0035-publish-settings-step.md) | Publish settings step | Settings move from the editor sidebar to a publish dialog; drafts autosave the title; no Save button; Unpublish in the post list | Accepted | 2026-11-24 |
| [0036](0036-moment-data-model-and-composer.md) | Moment data model and composer | `moment` plus ordered `moment_media`; no interaction columns; plain textarea composer over the existing upload endpoint | Accepted | 2026-11-25 |
| [0037](0037-post-views-and-anonymous-likes.md) | Post views and anonymous likes | `post_view` counts every opening; likes are reversible `reaction` rows keyed by a cookie set on the first like; ahead of v2.5 | Accepted | 2026-11-25 |
| [0038](0038-post-language-versions.md) | Post language versions | Each version is a `post` row with `language` and `translation_of`; one version per language per group; lists show one card per group | Accepted | 2026-11-25 |
