# Architecture and Engineering Standards

> v0.6 · 2026-09-01
> Requirements: `PRD.md`. Decisions: `adr/`.

---

## 1. Extensibility

Build seams only where change is already identified. Speculative abstraction costs more than none: it spreads every change across files and is usually never used.

| Likely to change — build a seam | Unlikely to change — write it directly |
|---|---|
| Content types beyond film, book, game, place | User and session models |
| Interaction types (like, bookmark, vote) | Media storage and reference model |
| External metadata providers | Markdown rendering pipeline |
| Image host, mail provider, database host | Routing and page organisation |
| Login methods | Tag system |
| Side effects after publishing | |

Principles:

- **Rule of three.** Abstract on the third occurrence, not the second.
- **YAGNI.** No speculative features. Do reserve columns; adding one is far cheaper than restructuring a table.
- **Dependency inversion.** Business code depends on interfaces, not concrete services.
- **Configuration over hardcoding.**
- **Single export.** Each feature module exposes only its `index.ts`.

---

## 2. Layering

```
Route / page layer (app/)     Assembly only: fetch, pass to components, navigate
        |  may call
Service layer                 Business rules, authorisation, transactions, events
        |  may call
Repository layer              The only code that touches the database
        |
        Prisma / PostgreSQL
```

Enforced by ESLint `no-restricted-imports`:

1. `app/` MUST NOT import `prisma`.
2. Only `*.repository.ts` may import `prisma`.
3. Cross-module imports MUST target the other module's `index.ts`.

Rule 3 is the foundation: while the exported signature holds, internals can be restructured freely.

### Directory layout

```
src/
  app/                        # Next.js routes, assembly only
    (site)/                   # Public group
      page.tsx
      blog/[slug]/page.tsx
      moments/page.tsx
      life/[type]/page.tsx
      gallery/page.tsx
    (admin)/admin/            # Admin group, separate layout
    api/
  features/                   # Self-contained business modules
    post/
      components/
      server/
        post.service.ts       #   Business logic
        post.repository.ts    #   Only prisma consumer
      schema.ts               #   zod schemas and inferred types
      index.ts                #   Sole public export
    moment/  item/  photo/  comment/  auth/  media/  tag/
  components/
    ui/                       # Admin primitives; public pages may use custom components
    layout/
  lib/
    db.ts                     #   Prisma singleton
    storage/                  # * Storage adapter
    mail/                     # * Mail adapter
    metadata/                 # * Metadata adapters
    events.ts                 # * Event bus
    auth.ts                   # Better Auth server configuration
    env.ts                    #   Centralised env validation
  config/
    content-types.ts          # * Content type registry
    site.ts
    navigation.ts
  styles/
prisma/
  schema.prisma
  migrations/                 # One file per change; never edit production by hand
  seed.ts
docs/
  PRD.md  architecture.md  ROADMAP.md  tech-debt.md  adr/
tests/
  unit/  e2e/
```

The five `*` entries are the project's only extension points.

### Public presentation boundary

- Content and business modules remain independent of the public visual system.
- Formal and personal pages use separate layout shells, design tokens, and style entry points.
- Content components expose semantic structure and contain no opening-sequence or ambient-motion logic.
- Layout shells own page transitions and decorative motion. Effects cannot own navigation, data loading, or content visibility.
- The formal shell stays restrained and has no background animation. The personal shell may add expressive colour and richer motion later.
- Motion is progressive enhancement, respects `prefers-reduced-motion`, and never delays readable content.
- Do not select a motion dependency or personal-host routing implementation until the personal visual direction is approved.

This boundary allows visual redesigns to remain inside layouts, public components, styles, and motion adapters. It does not promise zero presentation-layer changes.

### Technology baseline

- Next.js 16 App Router and strict TypeScript form the application runtime.
- Tailwind CSS v4 is the styling base. shadcn/ui and Radix are limited to admin primitives. Public pages may use custom CSS and components.
- Neon PostgreSQL in Singapore is the source of truth. Prisma is selected, but its major version and runtime adapter remain provisional until bootstrap validation.
- Better Auth provides owner sessions and six-digit email codes. See ADR-0004.
- Cloudflare R2 stores media behind the project domain.
- Pure Markdown is authoritative. remark, rehype, and Shiki render content on the server. See ADR-0005.
- Vercel Preview supports current development. Production hosting and image processing remain provisional under ADR-0008.

---

## 3. Extension points

### 3.1 Content type registry — `config/content-types.ts`

Adding a type (podcast, exhibition, album) must not duplicate the film module.

```ts
export const contentTypes = {
  movie: {
    key: 'movie',
    label: 'Films',
    route: '/life/movies',
    icon: FilmIcon,
    coverAspect: '2/3',
    metadataProvider: 'tmdb',
    extraFields: ['director', 'runtime', 'country'],
    features: { rating: true, review: true, visitorRating: true },
  },
  book:  { /* coverAspect: '2/3', provider: 'openlibrary' */ },
  game:  { /* coverAspect: '3/4', provider: 'igdb'        */ },
  place: { /* coverAspect: '3/2', provider: null          */ },
} satisfies Record<string, ContentTypeConfig>
```

List pages, detail pages, and admin forms render from this config. A new content type is one entry here, with no changes elsewhere.

### 3.2 Adapters — `lib/storage`, `lib/mail`, `lib/metadata`

```ts
// lib/storage/types.ts
export interface StorageAdapter {
  upload(file: Buffer, key: string, mime: string): Promise<{ url: string }>
  delete(key: string): Promise<void>
  getSignedUrl(key: string, ttl: number): Promise<string>
}

// lib/storage/r2.ts      -> class R2Storage implements StorageAdapter
// lib/storage/index.ts   -> export const storage: StorageAdapter = new R2Storage()
```

Swapping a provider changes one line in `index.ts`. Mail and metadata follow the same shape: a `SpotifyProvider` enables albums without touching other code.

### 3.3 Polymorphic interactions

Comments use `targetType` + `targetId` (`PRD.md` section 5); the pattern extends to a future `Reaction` table. Making a type commentable is one enum value plus `features.comment: true`.

Cost: no foreign keys. Referential integrity is enforced in the application layer — deleting a post must delete its comments. See ADR-0002.

### 3.4 Event bus — `lib/events.ts`

Publishing triggers a growing set of side effects. Hardcoding them into `publishPost()` means editing it for every addition.

```ts
await events.emit('post.published', { postId })

events.on('post.published', generateOgImage)
events.on('post.published', notifySubscribers)
events.on('post.published', revalidateSitemap)
```

An in-memory bus is sufficient. Replace it with a queue behind the same interface if reliable delivery is needed.

### 3.5 Database evolution

- All structural changes go through `prisma migrate`. Migration files are committed. Never modify production by hand.
- New columns are nullable or defaulted.
- Never drop or rename a column directly. Use expand–migrate–contract: add, backfill and switch reads, drop a release or two later.
- Every table has `createdAt` and `updatedAt`. Deletion is soft, via `deletedAt`.
- Add indexes in response to real queries; indexes slow writes.
- JSON is an escape hatch. Any field used for filtering, sorting, or aggregation MUST be a real column.
- Neon is serverless: account for cold starts and connection limits; configure Prisma pooling.

### 3.6 Acceptance criteria

| Scenario | Target |
|---|---|
| Add a life-list content type | Edit `config/content-types.ts`, optionally add a provider |
| Make a content type commentable | One enum value plus one config line |
| Add a login method | One change in `lib/auth.ts` |
| Swap image host or mail provider | One change in the adapter's `index.ts` |
| Add a post-publish side effect | One event listener |
| Add a static page | No existing file changes |
| Add a field to one content type | One migration, schema, and form change |

Any failing row is an architectural defect.

---

## 4. Engineering practices

**Requirements.** `PRD.md` holds numbered FRs with acceptance criteria, tiered v1 / v1.5 / v2. Ideas are added there with a version tag before any code. Changes are logged.

**Decisions.** This document plus `adr/`. Every significant decision gets one record: context, options, trade-offs, decision, consequences. Records are append-only; a reversal supersedes rather than edits.

**Project management.** GitHub Issues and Projects; milestones map to releases. Fields, states, and granularity: `CONTRIBUTING.md`.

**Version control.** Lightweight GitHub Flow. Branch, commit, PR, and review rules: `CONTRIBUTING.md`.

**Testing.**
- Vitest for service-layer logic, utilities, zod schemas, authorisation. UI coverage is not a target.
- Playwright for critical-path smoke tests only: homepage loads, admin login, publish a post, view it. Cap at 10.
- Database tests run against a dedicated test database seeded by `prisma/seed.ts`.
- v1 covers authorisation and validation only. v1.5 adds key business logic and E2E smoke. Coverage percentage is not a goal.

**CI/CD.**
- GitHub Actions runs `lint`, `typecheck`, `test`, `build` on every push and PR. Any failure blocks merge.
- Every PR gets a Vercel Preview URL, openable on a phone. The production host remains provisional under ADR-0008.
- Merging to `main` deploys to production.
- Husky and lint-staged gate commits locally.

**Database operations.** Migrations via `prisma migrate`, committed. `prisma/seed.ts` populates a new environment in one command. The Neon restore procedure MUST be rehearsed; an untested backup is not a backup. Review slow queries after launch and use `EXPLAIN` to catch ORM N+1 patterns.

**Observability.** Structured logs cover login, publish, upload, and delete. Error and availability providers require a separate decision and mainland reachability check. Traffic analytics are deferred beyond v1.

**Security.** After v1.5, audit against the OWASP Top 10 and commit the report to `docs/`. Enable Dependabot.

**Maintenance.** Record accepted compromises in `tech-debt.md` immediately: location, problem, impact, repayment trigger. Update `CHANGELOG.md` per release from Conventional Commits. Process dependency PRs monthly. Review for duplication after each release.

---

## 5. Adoption sequence

**v1.** TypeScript strict · ESLint + Prettier + Husky · layered structure with import boundaries · migration discipline · zod validation · `lib/env.ts` · branch strategy, Conventional Commits, self-reviewed PRs · ADRs · GitHub Actions baseline · provider preview · structured error capture · authorisation and validation unit tests · debt ledger

**v1.5.** Business-logic unit tests · Playwright smoke tests · GitHub Projects in active use · Dependabot · structured logging · generated CHANGELOG

**v2.** Broader coverage · performance budget with Lighthouse CI · OWASP report · staging environment · restore rehearsal

**Never.** Microservices · Kubernetes · self-hosted CI · monorepo · GraphQL · event sourcing · micro-frontends. These solve multi-team and large-scale problems and add only complexity here.

---

## Change log

| Date | Version | Change |
|---|---|---|
| 2026-08-29 | v0.1 | First draft. Layering, five extension points, practices, adoption sequence |
| 2026-08-30 | v0.2 | Removed the suggested learning order |
| 2026-08-30 | v0.3 | Renamed from `02-architecture.md` |
| 2026-08-30 | v0.4 | Condensed to concise technical English. No standards changed |
| 2026-08-31 | v0.5 | Aligned architecture with the confirmed technology baseline and provisional hosting decision |
| 2026-09-01 | v0.6 | Added the formal and personal presentation boundary for deferred visual and motion work |
| 2026-09-03 | v0.7 | Adopted Vercel previews before final production host selection |
