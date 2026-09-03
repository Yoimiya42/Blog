# Release Roadmap

> v1.1 · 2026-09-03
> Product scope: [PRD.md](PRD.md). Daily status: [Personal Site Delivery](https://github.com/users/Yoimiya42/projects/1).

## v1 — Initial Launch

- **Target date**: 2026-09-30
- **Milestone**: [v1 — Initial Launch](https://github.com/Yoimiya42/Blog/milestone/1)
- **Outcome**: Ship a credible public identity, a readable technical blog, and a phone-first owner publishing workflow on a custom domain reachable from mainland China.

### Success conditions

- A recruiter or professor can identify the owner, background, work, and contact path within 30 seconds.
- A public visitor can browse posts and tags without an account.
- The owner can sign in, write, upload an image, preview, and publish from a phone in under five minutes.
- The production site passes the mainland China, UK, performance, security, privacy, and accessibility release gates.

### Committed scope

- Homepage identity, education, experience, projects, skills, contact links, recent posts, and hidden entrance.
- Blog list, post detail, tags, pagination, code highlighting, table of contents, responsive images, drafts, and protected previews.
- Owner-only email OTP authentication.
- Mobile post management, Markdown editing, autosave, publishing, media upload, and media library.
- Custom-domain application delivery on Cloudflare Workers and image delivery through the approved pipeline.
- GitHub Actions, local quality gates, versioned database migrations, and release validation.

### Non-goals

- Moments, life list, gallery, comments, visitor accounts, ratings, whispers, and subscriptions.
- GitHub or Google login.
- Search, RSS, math, post series, offline editing, PWA installation, dark mode, and i18n.
- Traffic analytics.
- ICP filing, mainland hosting, or a native application.

## Delivery plan

| Window | Exit condition |
|---|---|
| 2026-09-01 to 2026-09-03 | Vercel Preview, application skeleton, and launch identity are ready |
| 2026-09-03 to 2026-09-05 | Cloudflare platform decision and minimal Workers preview are complete |
| 2026-09-06 to 2026-09-10 | Drizzle/D1, authentication, and Markdown foundations are complete |
| 2026-09-11 to 2026-09-19 | Public homepage, blog, admin, editor, and media vertical slices work |
| 2026-09-20 to 2026-09-25 | Publishing workflow, hidden entrance, and cross-cutting gates pass |
| 2026-09-26 to 2026-09-30 | Production deployment and UK/mainland release validation pass |

The dates are sequencing targets, not permission to weaken acceptance criteria. A missed hard constraint moves the release date or removes scope through a PRD change.

## Work breakdown

| Issue | Outcome | Priority | Size | State | Depends on |
|---|---|---:|---:|---|---|
| [#1](https://github.com/Yoimiya42/Blog/issues/1) | Record technology baseline | P0 | S | Done | — |
| [#3](https://github.com/Yoimiya42/Blog/issues/3) | Establish the v1 release plan | P0 | S | Done | #1 |
| [#5](https://github.com/Yoimiya42/Blog/issues/5) | Bootstrap application and quality gates | P0 | M | Done | #1 |
| [#6](https://github.com/Yoimiya42/Blog/issues/6) | Freeze launch identity and content | P0 | M | Done | Owner decisions |
| [#27](https://github.com/Yoimiya42/Blog/issues/27) | Establish Vercel preview deployment | P0 | S | Done | #5 |
| [#29](https://github.com/Yoimiya42/Blog/issues/29) | Establish Cloudflare platform foundation | P0 | M | In progress | #5, #27 |
| [#4](https://github.com/Yoimiya42/Blog/issues/4) | Select the Workers image pipeline | P0 | M | Backlog | #29, representative media |
| [#7](https://github.com/Yoimiya42/Blog/issues/7) | Implement Drizzle/D1 database foundation | P0 | M | Backlog | #29 |
| [#8](https://github.com/Yoimiya42/Blog/issues/8) | Implement owner authentication | P0 | M | Backlog | #5, #7 |
| [#9](https://github.com/Yoimiya42/Blog/issues/9) | Implement Markdown rendering | P0 | M | Backlog | #5 |
| [#10](https://github.com/Yoimiya42/Blog/issues/10) | Ship public blog | P0 | L | Backlog | #7, #9, #14 |
| [#11](https://github.com/Yoimiya42/Blog/issues/11) | Ship public homepage | P0 | L | Backlog | #6, #7 |
| [#12](https://github.com/Yoimiya42/Blog/issues/12) | Implement post management | P0 | M | Backlog | #7, #8 |
| [#13](https://github.com/Yoimiya42/Blog/issues/13) | Implement mobile Markdown editor | P0 | L | Backlog | #9, #12 |
| [#14](https://github.com/Yoimiya42/Blog/issues/14) | Implement media upload and library | P0 | L | Backlog | #7, #8 |
| [#15](https://github.com/Yoimiya42/Blog/issues/15) | Implement draft and publish workflow | P0 | M | Backlog | #10, #12, #13, #14 |
| [#16](https://github.com/Yoimiya42/Blog/issues/16) | Implement hidden entrance | P1 | S | Backlog | #6, #11 |
| [#17](https://github.com/Yoimiya42/Blog/issues/17) | Meet security, privacy, and accessibility gates | P0 | L | Backlog | All feature Issues |
| [#18](https://github.com/Yoimiya42/Blog/issues/18) | Deploy Workers production and custom domains | P0 | M | Backlog | #4, #6, #29, feature-complete build |
| [#19](https://github.com/Yoimiya42/Blog/issues/19) | Validate the v1 release | P0 | M | Backlog | #6, #17, #18 |

Publishing path: `#1 -> #5 -> #27 -> #29 -> #7 -> #8/#9/#14 -> #10/#12 -> #13 -> #15 -> #17/#18 -> #19`.

Platform path: #29 validates the Workers runtime before D1 work starts. #4 selects image processing before #14 implements media upload. Vercel remains a rollback path until #29 passes.

Public identity path: `#6 -> #11 -> #16 -> #17/#18 -> #19`.

## Release gates

v1 ships only when:

- Every Milestone Issue is `Done`, or removed through an explicit PRD version change.
- An accepted ADR confirms production hosting and image processing before launch.
- All required CI checks pass on `main`.
- The owner publishing flow completes on supported mobile browsers in under five minutes.
- The production application and image domains pass UK and mainland China tests.
- No first paint or primary action depends on a blocked third-party resource.
- Known accepted compromises are recorded in `tech-debt.md`.

## Workflow

GitHub Project states are `Backlog -> Ready -> In progress -> In review -> Done`. Move an Issue to `Ready` only when its dependencies and required owner decisions are complete.
