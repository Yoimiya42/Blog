# Release Roadmap

> v2.4 · 2026-11-14
> Product scope: [PRD.md](PRD.md). Daily status: [Personal Site Delivery](https://github.com/users/Yoimiya42/projects/1).

## Planning rules

- Milestones carry no calendar dates. Order and exit conditions control delivery.
- Each milestone ends with one usable outcome on production.
- One feature branch is worked on at a time. Merge it before starting the next Issue, unless it is blocked.
- A blocked branch may be parked. Work then moves to an Issue whose dependencies are all met. Record each parked branch and its blocker in the scope notes.
- Only the current milestone is planned in detail. Later milestones are re-checked when they start.
- A missed hard constraint removes scope through a PRD change. It never weakens acceptance criteria.

## v1 — Initial Launch

**Outcome**: Ship a credible public identity, a readable technical blog, and a phone-first owner publishing workflow on a custom domain reachable from mainland China.

### Success conditions

- A recruiter or professor can identify the owner, background, work, and contact path within 30 seconds.
- A public visitor can browse posts and tags without an account.
- The owner can sign in, write, upload an image, preview, and publish from a phone in under five minutes.
- The production site passes the mainland China, UK, performance, security, privacy, and accessibility release gates.

### Committed scope

- Homepage identity, education, experience, projects, skills, contact links, recent posts, and hidden entrance.
- Blog list, post detail, tags, pagination, code highlighting, table of contents, responsive images, drafts, and protected previews.
- Owner-only email OTP authentication.
- Mobile post management, TipTap editing, autosave, publishing, media upload, and media library.
- Custom-domain application delivery on Cloudflare Workers and image delivery through the approved pipeline.
- GitHub Actions, local quality gates, versioned database migrations, and release validation.

### Non-goals

- Moments, life list, gallery, comments, visitor accounts, ratings, whispers, and subscriptions.
- GitHub or Google login.
- Search, RSS, math, post series, offline editing, PWA installation, dark mode, and i18n.
- Traffic analytics.
- ICP filing, mainland hosting, or a native application.

## Current state

- M0 is complete. M1 is in progress with #18.
- `fangmingluan.com` serves `main` commit `fca8a3e`: the real homepage from #11.
- Owner authentication is on `main` as `973c241` but is not deployed. GitHub returned 502 during the merge and emitted no push event, so neither the quality gates nor Workers Builds ran on that commit. `/login` returns 404 on production. The next push to `main` builds and deploys it.
- Production binds `blog-production` and previews bind `blog-preview`; see ADR-0015. Both hold the five auth migrations. Production holds the seeded owner and the four auth secrets. `personal-site-development` is retired once `main` deploys the new binding.
- `www.fangmingluan.com`, `life.fangmingluan.com`, and `_dmarc.fangmingluan.com` have no DNS records.
- Mainland China reachability is unverified.

## Milestones

Milestones run in order. Each is a GitHub Milestone with the same name, prefixed `v1`.

| Milestone | Exit condition | Issues |
|---|---|---|
| M0 — Close in-flight work | Owner authentication is merged with `/admin` protected; no other branch is in flight; the Post field contract is recorded | #45, #8 |
| M1 — Identity live | The real homepage is live on `fangmingluan.com`; `www` redirects; login codes reach QQ Mail and 163 Mail; a mainland tester loads the homepage | #11, #18 |
| M2 — Text blog | The owner writes and publishes a post with code blocks from a phone; visitors read it on the public blog | #38, #12, #13, #15, #10, #16 |
| M3 — Media | An accepted ADR selects the image pipeline; the owner publishes a post with a phone photo in under five minutes | #4, #14 |
| M4 — Release gates | Every release gate below passes | #17, #19 |

### Scope notes

- **M0**: #8 delivers the server-side `/admin` guard, logout, and the owner seed path. QQ Mail and 163 Mail delivery tests move to M1 because they need the production mail domain.
- **Order exception, 2026-11-12**: #8 is paused on `feat/8-owner-auth` (draft PR #40) at the owner's request. #11 runs ahead of it because it has no authentication dependency. This follows the blocked-branch rule added in v2.2. M0 stays open, and #18 still requires #8. #8 resumed on 2026-11-13 after #11 merged.
- **M1**: The homepage is hardcoded (FR-HOME-08) and needs no content tables. The `Writing` section stays hidden until posts exist; #10 wires real posts into it. Production stays on Workers Free; see ADR-0014. Homepage source content in `launch-content.md` is an owner input and blocks this milestone.
- **M2**: #38 implements Post, Tag, and PostTag only, using the field contract in PRD section 5. The editor ships without the image control. Production moves to Workers Paid before the public blog ships.
- **M3**: #4 covers HEIC and HEIF input, server-side verification of GPS EXIF removal, and direct-to-R2 upload. #14 adds the Media table, upload, library, the editor image control, and the production R2 image domain moved from #18.
- **M4**: #19 repays TD-001.

## Work breakdown

| Issue | Outcome | Milestone | Priority | Size | State | Depends on |
|---|---|---|---:|---:|---|---|
| [#1](https://github.com/Yoimiya42/Blog/issues/1) | Record technology baseline | Foundation | P0 | S | Done | — |
| [#3](https://github.com/Yoimiya42/Blog/issues/3) | Establish the v1 release plan | Foundation | P0 | S | Done | #1 |
| [#5](https://github.com/Yoimiya42/Blog/issues/5) | Bootstrap application and quality gates | Foundation | P0 | M | Done | #1 |
| [#6](https://github.com/Yoimiya42/Blog/issues/6) | Freeze launch identity and content | Foundation | P0 | M | Done | Owner decisions |
| [#27](https://github.com/Yoimiya42/Blog/issues/27) | Establish Vercel preview deployment | Foundation | P0 | S | Done | #5 |
| [#29](https://github.com/Yoimiya42/Blog/issues/29) | Establish Cloudflare platform foundation | Foundation | P0 | M | Done | #5, #27 |
| [#7](https://github.com/Yoimiya42/Blog/issues/7) | Implement SQL-first D1 auth foundation | Foundation | P0 | M | Done | #29 |
| [#9](https://github.com/Yoimiya42/Blog/issues/9) | Implement TipTap content foundation | Foundation | P0 | M | Done | #5, #29 |
| [#45](https://github.com/Yoimiya42/Blog/issues/45) | Re-plan v1 as undated milestones | M0 | P0 | S | Done | — |
| [#8](https://github.com/Yoimiya42/Blog/issues/8) | Implement owner authentication | M0 | P0 | M | Done | #5, #7 |
| [#11](https://github.com/Yoimiya42/Blog/issues/11) | Ship public homepage | M1 | P0 | L | Done | #6, owner content |
| [#18](https://github.com/Yoimiya42/Blog/issues/18) | Deploy Workers production and custom domains | M1 | P0 | M | In progress | #8, #11 |
| [#38](https://github.com/Yoimiya42/Blog/issues/38) | Implement content persistence and D1 operations | M2 | P0 | M | Backlog | #7, #9 |
| [#12](https://github.com/Yoimiya42/Blog/issues/12) | Implement post management | M2 | P0 | M | Backlog | #8, #38 |
| [#13](https://github.com/Yoimiya42/Blog/issues/13) | Implement mobile TipTap editor | M2 | P0 | L | Backlog | #9, #12 |
| [#15](https://github.com/Yoimiya42/Blog/issues/15) | Implement draft and publish workflow | M2 | P0 | M | Backlog | #12, #13 |
| [#10](https://github.com/Yoimiya42/Blog/issues/10) | Ship public blog | M2 | P0 | L | Backlog | #9, #11, #38, #15 |
| [#16](https://github.com/Yoimiya42/Blog/issues/16) | Implement hidden entrance | M2 | P1 | S | Backlog | #10, #11 |
| [#4](https://github.com/Yoimiya42/Blog/issues/4) | Select the Workers image pipeline | M3 | P0 | M | Backlog | #29, representative media |
| [#14](https://github.com/Yoimiya42/Blog/issues/14) | Implement media upload and library | M3 | P0 | L | Backlog | #4, #13 |
| [#17](https://github.com/Yoimiya42/Blog/issues/17) | Meet security, privacy, and accessibility gates | M4 | P0 | L | Backlog | All feature Issues |
| [#19](https://github.com/Yoimiya42/Blog/issues/19) | Validate the v1 release | M4 | P0 | M | Backlog | #17 |

Delivery path: `#45 -> #8 -> #11 -> #18 -> #38 -> #12 -> #13 -> #15 -> #10 -> #16 -> #4 -> #14 -> #17 -> #19`.

Issue #31 is closed. Its upload requirements moved into #4; PRD section 2.5 already excludes a native application.

## Release gates

v1 ships only when:

- Every Milestone Issue is `Done`, or removed through an explicit PRD version change.
- An accepted ADR confirms production hosting and image processing before launch.
- All required CI checks pass on `main`.
- The owner publishing flow completes on supported mobile browsers in under five minutes.
- The production application and image domains pass UK and mainland China tests.
- No first paint or primary action depends on a blocked third-party resource.
- Known accepted compromises are recorded in `tech-debt.md`.

## After v1

Order only. Scope is defined in PRD section 2. Each release is planned when the previous one ships.

1. v1.5 — Moments, visitor accounts, comments.
2. v2 — Life list, visitor ratings, metadata fetch.
3. v2.5 — Gallery, whispers, subscriptions, dark mode, RSS, travel map.

## Workflow

GitHub Project states are `Backlog -> Ready -> In progress -> In review -> Done`. Move an Issue to `Ready` only when its dependencies and required owner decisions are complete.

## History

The original plan targeted 2026-09-30 with dated windows. Work paused from 2026-09-08 to 2026-11-10 and the target was missed. Version 2.0 replaced the dated plan with ordered milestones. Version 2.1 recorded the #8 pause and the #11 order exception. Version 2.2 allowed a blocked branch to be parked while a dependency-free Issue proceeds. Version 2.3 recorded #8 resuming and #45 closing. Version 2.4 recorded M0 closing, #18 starting, and the R2 image domain moving from #18 to #14.
