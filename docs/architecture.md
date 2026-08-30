# Architecture and Engineering Standards

> v0.4 · 2026-08-30
> Requirements: `PRD.md`. Decisions: `adr/`.

---

## 1. Extensibility approach

### 1.1 Abstract only at identified change points

Extensibility is not "make everything pluggable". Speculative abstraction costs more than no abstraction: it spreads a single change across many files, and most reserved extension points are never used.

Identify what is likely to change, build seams only there, and write everything else directly.

| Likely to change — build a seam | Unlikely to change — write it directly |
|---|---|
| New content types beyond film, book, game, place | User and session models |
| New interaction types (like, bookmark, vote) | Media storage and reference model |
| New external metadata providers | Markdown rendering pipeline |
| Swapping image host, mail provider, or database host | Routing and page organisation |
| New login methods | Tag system |
| New side effects after publishing content | |

Every design below targets one row in the left column.

### 1.2 General principles

- **Rule of three.** Consider abstracting on the third occurrence, not the second.
- **YAGNI.** Do not implement speculative features. Do reserve columns: adding a column is far cheaper than restructuring a table.
- **Dependency inversion.** Business code depends on interfaces, not concrete services.
- **Configuration over hardcoding.** Anything that can live in a config file does not belong scattered through code.
- **Single export.** Each feature module exposes only its `index.ts`.

---

## 2. Layering

### 2.1 Three layers, strict boundaries

```
Route / page layer (app/)     Assembly only: fetch data, pass to components, handle navigation
        |  may call
Service layer                 Business rules, authorisation, transactions, event emission
        |  may call
Repository layer              The only place allowed to touch the database
        |
        Prisma / PostgreSQL
```

Hard rules, enforced by ESLint `no-restricted-imports`:

1. `app/` MUST NOT import `prisma`. Pages never query the database directly.
2. Only `*.repository.ts` may import `prisma`.
3. Cross-module imports MUST target the other module's `index.ts`. Reaching into another module's internals is forbidden.

Rule 3 is the foundation: as long as the exported signature holds, a module's internals can be restructured without touching consumers.

### 2.2 Directory layout

```
src/
  app/                        # Next.js routes, assembly only
    (site)/                   # Public site group
      page.tsx                #   Homepage
      blog/[slug]/page.tsx
      moments/page.tsx
      life/[type]/page.tsx
      gallery/page.tsx
    (admin)/admin/            # Admin group, separate layout
    api/                      # API routes
  features/                   # Self-contained business modules
    post/
      components/             #   Feature-specific UI
      server/
        post.service.ts       #   Business logic
        post.repository.ts    #   Data access, the only prisma consumer
      schema.ts               #   zod schemas and inferred types
      index.ts                #   Sole public export
    moment/  item/  photo/  comment/  auth/  media/  tag/
  components/
    ui/                       # Generic, business-free components
    layout/                   # Header, footer, navigation
  lib/                        # Cross-cutting infrastructure
    db.ts                     #   Prisma client singleton
    storage/                  # * Storage adapter (interface + R2)
    mail/                     # * Mail adapter (interface + Resend)
    metadata/                 # * Metadata adapters (TMDB / IGDB / OpenLibrary)
    events.ts                 # * Event bus
    auth.ts
    env.ts                    #   Centralised environment validation
  config/
    content-types.ts          # * Content type registry
    site.ts                   #   Site metadata
    navigation.ts             #   Navigation structure
  styles/
prisma/
  schema.prisma
  migrations/                 # One file per structural change; never edit production by hand
  seed.ts                     # Development fixtures
docs/
  PRD.md                      # Requirements
  architecture.md             # This document
  ROADMAP.md                  # Release scope
  tech-debt.md                # Debt ledger
  adr/                        # Architecture decision records
tests/
  unit/  e2e/
```

The five entries marked `*` are the project's only extension points.

---

## 3. Extension points

### 3.1 Content type registry — `config/content-types.ts`

Adding a content type (podcast, exhibition, album) must not require duplicating the film module.

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

List pages, detail pages, and admin forms all render from this config. **Adding a content type means adding one entry here**, with no changes to existing code.

### 3.2 Pluggable adapters — `lib/storage`, `lib/mail`, `lib/metadata`

Business code depends on an interface, so swapping a provider touches one file.

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

Switching providers changes one line in `index.ts`. Mail and metadata follow the same shape: adding a `SpotifyProvider` enables albums without touching other code.

### 3.3 Polymorphic interactions

Comments already use `targetType` + `targetId` (see `PRD.md` section 5). The same pattern extends to a future `Reaction` table. Making a new content type commentable means adding one `CommentTarget` enum value and setting `features.comment: true` in the registry; the comment component is unchanged.

Cost: polymorphic targets cannot use foreign keys. Referential integrity is enforced in the application layer — deleting a post must delete its comments. Recorded in ADR-0002.

### 3.4 Event bus — `lib/events.ts`

Publishing a post triggers a growing set of side effects: OG image generation, subscriber notification, sitemap update, CDN purge, RSS sync. Hardcoding them into `publishPost()` means editing that function for every addition.

```ts
// Publishing emits one event
await events.emit('post.published', { postId })

// Listeners register independently
events.on('post.published', generateOgImage)
events.on('post.published', notifySubscribers)
events.on('post.published', revalidateSitemap)
```

Adding a side effect means adding a listener. An in-memory bus of a few dozen lines is sufficient; replace it with a queue behind the same interface if reliable delivery is ever needed.

### 3.5 Database evolution rules

The database is the hardest layer to change, so it carries the strictest rules.

- All structural changes go through `prisma migrate`. Migration files are committed. Never modify the production database by hand.
- New columns are nullable or defaulted, so existing code keeps running.
- Never drop or rename a column directly. Use expand–migrate–contract: add the new column, backfill and switch reads, then drop the old column a release or two later.
- Every table has `createdAt` and `updatedAt`. Deletion is soft, via `deletedAt`.
- Add indexes in response to real queries, not preemptively; indexes slow writes.
- JSON columns are an escape hatch. Any field used for filtering, sorting, or aggregation MUST be a real column.
- Neon is serverless: account for cold starts and connection limits, and configure Prisma connection pooling.

### 3.6 Extensibility acceptance criteria

| Scenario | Target |
|---|---|
| Add a life-list content type | Edit `config/content-types.ts`, optionally add a metadata provider |
| Make a new content type commentable | One enum value plus one config line |
| Add a login method | One change in `lib/auth.ts` |
| Swap image host or mail provider | One change in the adapter's `index.ts` |
| Add a post-publish side effect | One event listener |
| Add a static page | No existing file changes |
| Add a field to one content type | One migration, schema, and form change; no other module affected |

Any row that fails is a defect in the architecture.

---

## 4. Engineering practices

### 4.1 Requirements

`docs/PRD.md` holds numbered FRs with acceptance criteria, tiered v1 / v1.5 / v2. New ideas are added there with a version tag before any code is written. Requirement changes are recorded in the change log.

### 4.2 Architecture decisions

This document plus `docs/adr/`. Every significant technical decision gets one ADR: context, options considered, trade-offs, decision, consequences. ADRs are append-only. A reversed decision produces a new ADR that supersedes the old one; the old file is not edited.

### 4.3 Project management

GitHub Issues and GitHub Projects. Milestones map to v1 / v1.5 / v2. Issue fields, states, and granularity are defined in `CONTRIBUTING.md` and not duplicated here.

### 4.4 Version control

Lightweight GitHub Flow. Branch, commit, PR, and review rules are defined in `CONTRIBUTING.md`.

### 4.5 Testing

- **Vitest** for unit tests. Priority coverage: service-layer business logic, utilities, zod schemas, authorisation checks. UI component coverage is not a target.
- **Playwright** for end-to-end smoke tests on critical paths only: load the homepage, log into the admin, publish a post, view it. Cap at 10 tests.
- Database tests run against a dedicated test database seeded by `prisma/seed.ts`.

Sequencing: v1 covers authorisation and input validation only, where failures are most severe. v1.5 adds key business-logic units and E2E smoke tests. Coverage percentage is not a goal.

### 4.6 CI/CD

- **GitHub Actions**: every push and PR runs `lint`, `typecheck`, `test`, `build`. Any failure blocks merge.
- **Vercel Preview**: every PR gets a preview URL, openable on a phone for acceptance.
- **Production**: merging to `main` deploys automatically.
- **Local gate**: Husky and lint-staged format and check staged files before commit.

### 4.7 Database operations

- All migrations run through `prisma migrate`; migration files are committed.
- `prisma/seed.ts` populates a new environment in one command.
- Neon provides point-in-time recovery. The restore procedure MUST be rehearsed at least once; an untested backup is not a backup.
- Review slow queries after launch. Use `EXPLAIN` to identify N+1 patterns introduced by the ORM.

### 4.8 Observability

- **Sentry** for front-end and back-end error reporting with stack traces and user action trails.
- Structured logs for login, publish, upload, and delete, in a consistent format.
- **Vercel Analytics** for performance, **Umami** for traffic.
- **UptimeRobot** for availability alerts.

### 4.9 Security

After v1.5, audit the codebase against the OWASP Top 10 and commit the report to `docs/`. Enable GitHub Dependabot for dependency vulnerability alerts.

### 4.10 Maintenance

- **Technical debt**: record every accepted compromise in `docs/tech-debt.md` immediately, with location, problem, impact, and repayment trigger.
- **CHANGELOG.md**: updated on every release, generated from Conventional Commits.
- **Dependencies**: Renovate or Dependabot opens PRs; process them monthly rather than in bulk.
- **Refactoring**: after each release, review for duplication and apply the rule of three.

---

## 5. Adoption sequence

Adopting everything at once would stall v1. Order by cost against payoff.

### v1

TypeScript strict mode · ESLint + Prettier + Husky · layered directory structure with import boundary rules · Prisma migration discipline · zod input validation · centralised environment validation (`lib/env.ts`) · branch strategy, Conventional Commits, self-reviewed PRs · ADRs · GitHub Actions baseline checks · Vercel Preview · Sentry · unit tests for authorisation and validation · technical debt ledger

### v1.5

Unit tests for key business logic · Playwright E2E smoke tests · GitHub Projects in active use · Dependabot · structured logging · generated CHANGELOG

### v2

Broader test coverage · performance budget with Lighthouse CI · OWASP self-audit report · separate staging environment · backup restore rehearsal

### Never

Microservices · Kubernetes · self-hosted CI · monorepo · GraphQL · event sourcing · micro-frontends

These solve multi-team and large-scale problems. On a single-person personal site they add complexity without the benefit.

---

## Change log

| Date | Version | Change |
|---|---|---|
| 2026-08-29 | v0.1 | First draft. Layering, five extension points, engineering practice list and adoption sequence |
| 2026-08-30 | v0.2 | Removed the suggested learning order. Delivery sequencing lives in `docs/ROADMAP.md` and GitHub Issues |
| 2026-08-30 | v0.3 | Renamed from `02-architecture.md` |
| 2026-08-30 | v0.4 | Condensed to concise technical English per `AGENTS.md` section 3. No standards changed |
