# Release Roadmap

> v2.11 · 2026-11-19
> Product scope: [PRD.md](PRD.md). Daily status: [Personal Site Delivery](https://github.com/users/Yoimiya42/projects/1).

## Planning rules

- Milestones carry no calendar dates. Order and exit conditions control delivery.
- Each milestone ends with one usable outcome on production.
- One feature branch is worked on at a time. Merge it before starting the next Issue, unless it is blocked.
- A blocked branch may be parked. Work then moves to an Issue whose dependencies are all met. Record each parked branch and its blocker in the scope notes.
- Only the current milestone is planned in detail. Later milestones are re-checked when they start.
- A missed hard constraint removes scope through a PRD change. It never weakens acceptance criteria.
- Within a milestone, the Issue that tests the riskiest constraint runs first.
- A feature is cut into slices that each reach production. A decision Issue fixes only what is hard to reverse.
- Each pull request verifies its own change against the per-change gates in the PR template. The release audit confirms; it is not the first check.

## v1 — Initial Launch

**Outcome**: Ship a credible public identity, a readable technical blog, and an owner publishing workflow on a custom domain reachable from mainland China.

### Success conditions

- A recruiter or professor can identify the owner, background, work, and contact path within 30 seconds.
- A public visitor can browse posts and tags without an account.
- The owner can sign in, write, upload an image, preview, and publish on a desktop browser in under five minutes.
- The production site passes the UK, performance, security, privacy, and accessibility release gates. Mainland China results are recorded (ADR-0020).

### Committed scope

- Homepage identity, education, experience, projects, skills, contact links, recent posts, and hidden entrance.
- Blog list, post detail, tags, pagination, code highlighting, table of contents, responsive images, drafts, and protected previews.
- Owner-only email OTP authentication.
- Post management, TipTap editing, autosave, publishing, media upload, and media library.
- Custom-domain application delivery on Cloudflare Workers and image delivery through the approved pipeline.
- One approved visual direction, applied to the v1 public pages.
- GitHub Actions, local quality gates, versioned database migrations, and release validation.

### Non-goals

- Moments, life list, gallery, comments, visitor accounts, ratings, whispers, and subscriptions.
- GitHub or Google login.
- Search, RSS, math, post series, offline editing, PWA installation, dark mode, and i18n.
- Traffic analytics.
- ICP filing, mainland hosting, or a native application.

## Current state

- M0, M1, and M2 are complete. In M3, #4, #62, #14, and #63 are done. #66 runs in parallel as an owner task.
- `fangmingluan.com` serves the `main` Workers build: the real homepage from #11 and owner login from #8.
- The owner signs in on production with an email code and reaches `/admin`.
- The owner uploaded an image on production through the editor, and the editor displayed it (#14). On 2026-11-21 the owner deleted the unreferenced test image from the production library (#63): the row gained `deleted_at` with GPS cleared, and its R2 object was removed. Edge-cached widths keep serving until expiry; see TD-006.
- Production binds `blog-production` and previews bind `blog-preview`; see ADR-0015. Both hold migrations `0001` to `0006`: auth, then Post, Tag, and PostTag. Production also holds `0007`, the Media table, applied for #14. Production holds the seeded owner and the four auth secrets. `personal-site-development` was deleted on 2026-11-14.
- `www.fangmingluan.com` redirects to the root domain with 301, plain HTTP redirects to HTTPS, and DMARC is published at `p=quarantine`. The owner signed in on production; Gmail reported SPF, DKIM, and DMARC `PASS`. `life.fangmingluan.com` has no record. See `runbooks/production-domain.md`.
- Worker rollback and D1 Time Travel restore are rehearsed; see `runbooks/production-recovery.md`.
- Ruleset `protect-main` requires the `check` job before any merge to `main`; see `engineering/ci-cd.md`.
- The owner reported on 2026-11-14 that the homepage loads from a mainland China network. Network and load time were not recorded; #19 repeats the test with measurements.

## Milestones

Milestones run in order. Each is a GitHub Milestone with the same name, prefixed `v1`.

| Milestone | Exit condition | Issues |
|---|---|---|
| M0 — Close in-flight work | Owner authentication is merged with `/admin` protected; no other branch is in flight; the Post field contract is recorded | #45, #8 |
| M1 — Identity live | The real homepage is live on `fangmingluan.com`; `www` redirects; a login code reaches the owner mailbox with SPF, DKIM, and DMARC passing; a mainland tester loads the homepage | #11, #18 |
| M2 — Text blog | The owner writes and publishes a post with code blocks on a desktop browser; visitors read it on the public blog | #38, #12, #13, #15, #10, #16 |
| M3 — Media | The owner publishes a post with a phone-taken photo uploaded from a desktop browser; the image loads from the project domain with no GPS in the served file; a mainland load result is recorded | #4, #62, #14, #63, #64, #65 |
| M4 — Visual identity | The owner approves a visual direction; the v1 public pages match it on production | #66, #68 |
| M5 — Release gates | Every release gate below passes | #67, #58, #17, #19 |

### Scope notes

- **M0**: #8 delivers the server-side `/admin` guard, logout, and the owner seed path. QQ Mail and 163 Mail delivery tests move to M1 because they need the production mail domain.
- **Order exception, 2026-11-12**: #8 is paused on `feat/8-owner-auth` (draft PR #40) at the owner's request. #11 runs ahead of it because it has no authentication dependency. This follows the blocked-branch rule added in v2.2. M0 stays open, and #18 still requires #8. #8 resumed on 2026-11-13 after #11 merged.
- **M1**: The homepage is hardcoded (FR-HOME-08) and needs no content tables. The `Writing` section stays hidden until posts exist; #10 wires real posts into it. Production stays on Workers Free; see ADR-0014. Homepage source content in `launch-content.md` is an owner input and blocks this milestone. The QQ Mail and 163 Mail delivery tests left #18 on 2026-11-14 and now block v2.5, the release that opens login to visitors; see ADR-0016 and ADR-0017.
- **M2**: #38 implements Post, Tag, and PostTag only, using the field contract in PRD section 5. The editor ships without the image control. Production stays on Workers Free when the public blog ships; ADR-0019 sets the upgrade trigger. #15 ships publish and unpublish; scheduled publishing is deferred to v1.5. #15 revalidates `/` and `/blog` before those reads exist; #10 adds the pages. #16 targets `/blog` with a CSS-only veil and no motion dependency; the inner-layer visual language and its exit wait for the personal host (OQ-02).
- **M3**: Re-sliced by #61 on 2026-11-16. #4 is a short ADR: processing location, object key and URL scheme, whether originals are kept, `Media` fields, and how GPS EXIF removal is guaranteed. Multiple sizes, AVIF, and Cloudflare Images are deferred with a reopening trigger each. #62 attaches the R2 image domain and tests it from a mainland network before any upload code exists. #14 is the walking skeleton: upload, `Media` record, editor image control, and public rendering for JPEG, PNG, and WebP. A JPEG phone photo satisfies the exit condition after #14. #63 adds the library, #64 the reading presentation, #65 HEIC input. #65 moves to v1.5 through a PRD change if its decoder proves costly.
- **M3 update, 2026-11-17**: ADR-0021 closes #4. Cloudflare Images on delivery replaces the deferred list above; camera exports up to 50 MB are accepted. GPS is removed in the Worker at upload and coordinates are kept owner-only. ADR-0020 makes the #62 mainland test recorded, not blocking, so #14 no longer waits for a mainland tester. #62 also selects the transform call.
- **M4**: #66 closes OQ-02 and is owner work with no code; it runs in parallel with M3 and is exempt from the one-branch limit. #68 applies the result after M3, through tokens and layout shells only. The milestone precedes the release gates because they measure the final appearance. The formal host stays restrained unless #66 changes that principle through the PRD.
- **M5**: Formerly M4. #67 moves the performance budgets into CI and may run whenever a feature branch is blocked on owner input. #58 resolves TD-002 before the site is promoted. #17 is the final audit; per-change checks moved to the PR template. #19 repays TD-001.
- **Desktop acceptance, 2026-11-14**: v1 accepts the admin on a desktop browser. Phone acceptance left #12, #13, #14, and #19 and moved to #50 in v1.5. Admin layouts stay fluid and uploads stay server-processed, so phone support needs no rework.

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
| [#18](https://github.com/Yoimiya42/Blog/issues/18) | Deploy Workers production and custom domains | M1 | P0 | M | Done | #8, #11 |
| [#38](https://github.com/Yoimiya42/Blog/issues/38) | Implement content persistence and D1 operations | M2 | P0 | M | Done | #7, #9 |
| [#12](https://github.com/Yoimiya42/Blog/issues/12) | Implement post management | M2 | P0 | M | Done | #8, #38 |
| [#13](https://github.com/Yoimiya42/Blog/issues/13) | Implement TipTap editor | M2 | P0 | L | Done | #9, #12 |
| [#15](https://github.com/Yoimiya42/Blog/issues/15) | Implement draft and publish workflow | M2 | P0 | M | Done | #12, #13 |
| [#10](https://github.com/Yoimiya42/Blog/issues/10) | Ship public blog | M2 | P0 | L | Done | #9, #11, #38, #15 |
| [#16](https://github.com/Yoimiya42/Blog/issues/16) | Implement hidden entrance | M2 | P1 | S | Done | #10, #11 |
| [#61](https://github.com/Yoimiya42/Blog/issues/61) | Re-plan v1 from M3 as slices with a visual milestone | M3 | P0 | S | Done | — |
| [#4](https://github.com/Yoimiya42/Blog/issues/4) | Decide the v1 image pipeline | M3 | P0 | S | Done | #29 |
| [#62](https://github.com/Yoimiya42/Blog/issues/62) | Serve images from the R2 project domain | M3 | P0 | S | Done | #4, owner R2 access |
| [#14](https://github.com/Yoimiya42/Blog/issues/14) | Implement image upload | M3 | P0 | M | Done | #4, #62, #13 |
| [#63](https://github.com/Yoimiya42/Blog/issues/63) | Implement media library | M3 | P0 | S | Done | #14 |
| [#64](https://github.com/Yoimiya42/Blog/issues/64) | Present article images for reading | M3 | P1 | S | Backlog | #14 |
| [#65](https://github.com/Yoimiya42/Blog/issues/65) | Accept HEIC input | M3 | P1 | S | Backlog | #14 |
| [#66](https://github.com/Yoimiya42/Blog/issues/66) | Decide the visual direction | M4 | P0 | M | Backlog | Owner decisions |
| [#68](https://github.com/Yoimiya42/Blog/issues/68) | Apply the visual direction to public pages | M4 | P0 | L | Backlog | #66, M3 |
| [#67](https://github.com/Yoimiya42/Blog/issues/67) | Automate performance budgets in CI | M5 | P1 | S | Backlog | — |
| [#58](https://github.com/Yoimiya42/Blog/issues/58) | Remove the Workers Free CPU overrun dependency | M5 | P0 | M | Backlog | ADR-0019 trigger |
| [#17](https://github.com/Yoimiya42/Blog/issues/17) | Audit security, privacy, and accessibility | M5 | P0 | M | Backlog | All feature Issues, #68 |
| [#19](https://github.com/Yoimiya42/Blog/issues/19) | Validate the v1 release | M5 | P0 | M | Backlog | #17, #58 |

Delivery path: `#45 -> #8 -> #11 -> #18 -> #38 -> #12 -> #13 -> #15 -> #10 -> #16 -> #61 -> #4 -> #62 -> #14 -> #63 -> #64 -> #65 -> #68 -> #67 -> #58 -> #17 -> #19`. #66 runs in parallel from M3 and must close before #68.

Issue #31 is closed. Its upload requirements moved into #4; PRD section 2.5 already excludes a native application.

## Release gates

v1 ships only when:

- Every Milestone Issue is `Done`, or removed through an explicit PRD version change.
- An accepted ADR confirms production hosting and image processing before launch.
- All required CI checks pass on `main`.
- The owner publishing flow completes on supported desktop browsers in under five minutes.
- The production application and image domains pass UK tests. Mainland China results are recorded, not required to pass (ADR-0020, TD-003).
- No first paint or primary action depends on a blocked third-party resource.
- Known accepted compromises are recorded in `tech-debt.md`.

## After v1

Order only. Scope is defined in PRD section 2. Each release is planned when the previous one ships.

1. v1.5 — Owner publishing: phone-optimised admin (#50), scheduled publishing, Moments, RSS, math, offline tolerance, PWA, editable homepage.
2. v2 — Owner life list, metadata fetch.
3. v2.5 — Gallery, travel map, dark mode, visitor accounts, comments, visitor ratings, whispers, subscriptions.

Visitor accounts and every visitor-written feature ship in v2.5; see ADR-0017.

## Workflow

GitHub Project states are `Backlog -> Ready -> In progress -> In review -> Done`. Move an Issue to `Ready` only when its dependencies and required owner decisions are complete.

## History

The original plan targeted 2026-09-30 with dated windows. Work paused from 2026-09-08 to 2026-11-10 and the target was missed. Version 2.0 replaced the dated plan with ordered milestones. Version 2.1 recorded the #8 pause and the #11 order exception. Version 2.2 allowed a blocked branch to be parked while a dependency-free Issue proceeds. Version 2.3 recorded #8 resuming and #45 closing. Version 2.4 recorded M0 closing, #18 starting, the R2 image domain moving from #18 to #14, the QQ Mail and 163 Mail delivery tests moving out of v1, visitor accounts and interaction moving to v2.5 under #49, and phone acceptance of the admin moving to v1.5 under #50. Version 2.5 recorded #13 closing, #15 starting, and scheduled publishing moving to v1.5. Version 2.6 recorded #15 and #10 closing and #16 starting. Version 2.7 recorded #16 and M2 closing. Version 2.8 re-sliced M3 into #4, #62, #14, #63, #64, and #65, added M4 for the visual direction, renumbered the release gates to M5, and moved per-change checks out of #17. Version 2.9 recorded #4 closing with ADR-0021, adopted Cloudflare Images in v1, and made mainland tests recorded rather than blocking under ADR-0020. Version 2.10 recorded #62 and #14 closing and #63 starting. Version 2.11 recorded #63 closing.
