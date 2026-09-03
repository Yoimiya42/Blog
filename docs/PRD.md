# Personal Site — Product Requirements

> v0.7 · 2026-09-01 · Draft
> Single source of requirements. No feature ships without an entry here.

---

## 1. Positioning

A restrained academic and career homepage, with a private interest space behind a quiet entrance.

### 1.1 Audiences

| ID | Audience | Goal | Entry | Priority |
|---|---|---|---|---|
| P1 | Recruiters, professors, peers | Judge credibility in 30 seconds | Homepage, blog | Highest |
| P2 | Friends | Follow what the owner is doing | Moments, life list, gallery | High |
| P3 | Strangers | Arrive via one post or photo | Whole site | Medium |
| P4 | Owner | Record and publish from anywhere | Admin | Highest |

### 1.2 Success criteria

- A P1 visitor can state who the owner is, what they do, what they built.
- Publishing from a phone takes under 5 minutes.
- The site is still updated six months after launch.

### 1.3 Design principles

1. **Two personas.** Formal outer layer, personal inner layer, visually distinct.
2. **Mobile-first.** The admin is designed to write on. Design starts at 375px.
3. **Content first.** No effect delays first paint or disrupts reading.
4. **Low maintenance cost.** Fewer features over heavier process.
5. **Reachable from mainland China.** See 6.1.
6. **Seams only at identified change points.** See `architecture.md` section 1.

---

## 2. Scope

### 2.1 v1 — launch by 2026-09-30

Homepage · blog (list, detail, tags) · mobile-first admin (write, upload, publish) · `fangmingluan.com` · deployment · owner login (email code, 30-day session) · hidden entrance.

Excluded: life list, gallery, moments, visitor login, comments, ratings, whispers, subscriptions, dark mode, i18n.

### 2.2 v1.5 — 2026-10

Moments · visitor registration and login (email code and GitHub; reuses the v1 owner authentication system) · polymorphic comments.

### 2.3 v2 — 2026-11 to 2026-12

Life list (films, books, games, places) · visitor ratings and short reviews · cover and metadata fetch.

### 2.4 v2.5 — early 2027

Gallery · whisper inbox · update subscriptions · dark mode · RSS · travel map.

### 2.5 Out of scope, all versions

- Multi-user publishing. Owner only.
- Two-way messaging. Whispers run visitor to owner.
- ICP filing and mainland hosting. Slower mainland access is accepted.
- Visibility tiers. The `visibility` column is reserved so adding them needs no restructuring.
- Native app. Responsive web only.

---

## 3. Information architecture

### 3.1 Sitemap

| URL | Page | Version | Notes |
|---|---|---|---|
| `/` | Homepage | v1 | Formal CV style |
| `/blog` | Blog list | v1 | Paginated, tag filter |
| `/blog/[slug]` | Post detail | v1 | Slug from title, frozen after publish |
| `/blog/tags/[tag]` | Tag archive | v1 | |
| `/admin` | Admin home | v1 | Auth required |
| `/admin/posts` | Post management | v1 | List, create, edit, delete |
| `/admin/posts/[id]/edit` | Editor | v1 | |
| `/admin/media` | Media library | v1 | |
| `/moments` | Moments | v1.5 | Reverse-chronological feed |
| `/life` | Life list overview | v2 | Categories and stats |
| `/life/movies` `/life/books` `/life/games` `/life/places` | Category lists | v2 | Cover-led card grid |
| `/life/[type]/[id]` | Item detail | v2 | Owner review, ratings, comments |
| `/gallery` | Gallery | v2.5 | |
| `/gallery/[category]` | Category gallery | v2.5 | landscape / portrait / documentary |
| `/gallery/[id]` | Single photo | v2.5 | Large view, EXIF, story |
| `/whisper` | Whisper form | v2.5 | |
| `/login` | Login | v1 | Owner only in v1; opened to visitors in v1.5 |
| `/api/*` | API routes | v1 | |
| `/rss.xml` `/sitemap.xml` | Feed and index | v1.5 | |

**URLs are permanent once published.** Changing one breaks inbound links and search indexing.

### 3.2 Public hosts and locale paths

- `fangmingluan.com` hosts the formal academic and career homepage and technical blog.
- `life.fangmingluan.com` is reserved for the personal space. Its detailed visual system ships with the personal content, not v1.
- English is the primary locale and has no path prefix.
- Future locales use lowercase BCP 47 path prefixes: `/zh-hans`, `/zh-hant`, `/ja`, and `/fr`.
- The personal host follows the same locale convention.
- Language selection never redirects implicitly from browser settings.
- Translations may ship independently. Related translations use an internal association rather than a shared slug requirement.

See ADR-0007.

### 3.3 Hidden entrance

Must not distract P1 visitors; must reward curiosity.

- Homepage footer, small unlabelled glyph.
- Subtle response on hover or long press.
- 600–900ms full-page transition, not a standard navigation.
- Targets `/moments`, or `/blog` in v1. The inner layer uses a different visual language and an equally quiet exit.
- Targets `/blog` until personal content is available on `life.fangmingluan.com`.
- Keyboard reachable, `aria-label` present.

---

## 4. Functional requirements

`FR-<module>-<n>`. Each row carries its acceptance criteria.

### 4.1 Homepage (FR-HOME)

Serves a 30-second judgement: dense, clearly ranked, no background animation, no autoplay video.

| ID | Requirement | Version | Acceptance |
|---|---|---|---|
| FR-HOME-01 | Name, one-line identity, contact entry | v1 | Above the fold on a portrait phone |
| FR-HOME-02 | Education (UCL BSc CS) | v1 | School, degree, dates, optional GPA and highlights |
| FR-HOME-03 | Projects and experience | v1 | Title, dates, stack, one-line outcome, link |
| FR-HOME-04 | Skills by category | v1 | No percentage bars |
| FR-HOME-05 | Contact and external links | v1 | Email, GitHub, LinkedIn; no CV in v1 |
| FR-HOME-06 | Three most recent posts | v1 | |
| FR-HOME-07 | Hidden entrance | v1 | See 3.3 |
| FR-HOME-08 | Homepage content editable in admin | v1.5 | Hardcoded in v1 |
| FR-HOME-09 | Locale navigation | v2 | Explicit navigation between available locale paths; see ADR-0007 |

The v1 homepage uses this fixed order. Empty sections remain unpublished until source content is ready.

| Order | Visible heading | Content |
|---:|---|---|
| 1 | None | Name, identity line, location, and primary contact actions |
| 2 | `Profile` | Short biography, focus, and current objective |
| 3 | `Education` | Institution, degree, dates, and selected details |
| 4 | `Experience` | Employment, research, and relevant organisations |
| 5 | `Selected Projects` | Two to four representative projects |
| 6 | `Skills` | Languages, frameworks, and tools grouped by category |
| 7 | `Writing` | Up to three latest published technical posts |
| 8 | `Contact` | Email, GitHub, and LinkedIn |

Primary navigation labels are `Profile`, `Experience`, `Projects`, `Writing`, and `Contact`. Source status is tracked in `launch-content.md`.

### 4.2 Blog (FR-BLOG)

| ID | Requirement | Version | Acceptance |
|---|---|---|---|
| FR-BLOG-01 | Post list, reverse-chronological, paginated | v1 | 10 per page; title, summary, date, tags, reading time |
| FR-BLOG-02 | Post detail | v1 | CJK typography at line-height 1.75+, 17–18px |
| FR-BLOG-03 | Code highlighting | v1 | Python, TS, Java, C, Go; language label, copy button |
| FR-BLOG-04 | Tags and tag archive | v1 | Many tags per post |
| FR-BLOG-05 | Table of contents | v1 | Sidebar with scroll spy; collapsed on mobile |
| FR-BLOG-06 | Draft and published states | v1 | Drafts hidden from lists, reachable by preview link |
| FR-BLOG-07 | Images | v1 | Lazy-loaded, explicit dimensions, click to enlarge |
| FR-BLOG-08 | Math | v1.5 | KaTeX |
| FR-BLOG-09 | Full-text search | v2 | Client-side; revisit past 100 posts |
| FR-BLOG-10 | Post series | v2 | Previous and next within a series |
| FR-BLOG-11 | Comments | v1.5 | See 4.6 |
| FR-BLOG-12 | RSS | v1.5 | |

### 4.3 Moments (FR-MOMENT)

| ID | Requirement | Version | Acceptance |
|---|---|---|---|
| FR-MOMENT-01 | Reverse-chronological feed | v1.5 | Body, images, timestamp; no titles |
| FR-MOMENT-02 | 0–9 images per entry | v1.5 | Grid, tap for fullscreen carousel |
| FR-MOMENT-03 | Light Markdown | v1.5 | Bold, link, line break only |
| FR-MOMENT-04 | Optional place and mood | v1.5 | Plain text, no map API |
| FR-MOMENT-05 | Fast publishing from a phone | v1.5 | 5 interactions or fewer |
| FR-MOMENT-06 | Infinite scroll | v1.5 | |
| FR-MOMENT-07 | Comments | v1.5 | |

### 4.4 Life list (FR-LIFE)

All four categories share one structure and one component set, discriminated by `type`. See ADR-0002.

| ID | Requirement | Version | Acceptance |
|---|---|---|---|
| FR-LIFE-01 | Cover-led card grid | v2 | Missing covers use a placeholder without breaking layout |
| FR-LIFE-02 | Status: done, in progress, wishlist | v2 | Filterable |
| FR-LIFE-03 | Item detail page | v2 | Cover, basics, owner rating, long review, completion date |
| FR-LIFE-04 | Rating scale | v2 | 5 stars, half steps; OQ-04 |
| FR-LIFE-05 | Short review separate from long review | v2 | Short on the card, long on the detail page |
| FR-LIFE-06 | Sort and filter | v2 | Rating, completion date, year, tag |
| FR-LIFE-07 | Stats overview | v2 | Count per year, average, distribution |
| FR-LIFE-08 | Automatic cover and metadata fetch | v2 | Title entry populates cover, year, creator |
| FR-LIFE-09 | Extra fields for places | v2 | Country, city, visit dates, linked photos |
| FR-LIFE-10 | Travel map view | v2.5 | Visited places highlighted |
| FR-LIFE-11 | Visitor ratings and short reviews | v2 | See 4.6 |

Sources: TMDB (films), Google Books or Open Library (books), IGDB (games, needs a Twitch account), owner photos (places). Douban has no public API. Fetched covers MUST be stored locally, never hotlinked: external links expire and are unreliable from mainland China.

### 4.5 Gallery (FR-GALLERY)

| ID | Requirement | Version | Acceptance |
|---|---|---|---|
| FR-GALLERY-01 | Categories: landscape, portrait, documentary | v2.5 | Extensible |
| FR-GALLERY-02 | Masonry or grid at original aspect ratio | v2.5 | No layout shift |
| FR-GALLERY-03 | Progressive loading | v2.5 | blurhash or LQIP |
| FR-GALLERY-04 | Fullscreen viewer | v2.5 | Keyboard and gesture navigation |
| FR-GALLERY-05 | EXIF display | v2.5 | Camera, lens, aperture, shutter, ISO, focal length, date |
| FR-GALLERY-06 | Per-photo story | v2.5 | Optional, hidden when empty |
| FR-GALLERY-07 | Albums | v2.5 | Trip photos group together |
| FR-GALLERY-08 | Responsive multi-size output | v2.5 | Phones never load the 4000px original |
| FR-GALLERY-09 | Watermark, right-click protection | v2.5 | Pending, OQ-07 |

### 4.6 Accounts and interaction (FR-AUTH / FR-SOCIAL)

| ID | Requirement | Version | Acceptance |
|---|---|---|---|
| FR-AUTH-01 | Email login, 6-digit code | v1 | Primary method, see 6.1. v1 serves pre-provisioned owner addresses only; unknown addresses receive the same response. Opened to visitors in v1.5 |
| FR-AUTH-02 | GitHub login | v1.5 | Secondary method; verify mainland reachability before release |
| FR-AUTH-03 | Google login | v2 | Secondary, labelled as needing network access |
| FR-AUTH-04 | Owner account | v1 | `role = OWNER`, sole admin access |
| FR-AUTH-05 | Session persistence and logout | v1 | 30-day database-backed session; required by FR-ADMIN-01 |
| FR-AUTH-06 | Self-service account and data deletion | v1.5 | GDPR, see 6.5 |
| FR-SOCIAL-01 | Comments on posts, moments, items, photos | v1.5 | One polymorphic implementation |
| FR-SOCIAL-02 | Threaded replies | v1.5 | One level only |
| FR-SOCIAL-03 | Owner can delete or hide any comment | v1.5 | Single admin action |
| FR-SOCIAL-04 | New-comment notification | v1.5 | Email or admin badge |
| FR-SOCIAL-05 | Visitor rating and short review on items | v2 | Shown separately from the owner rating |
| FR-SOCIAL-06 | Whispers: private messages to the owner | v2.5 | Anonymous allowed, with abuse protection |
| FR-SOCIAL-07 | Email notification for new posts | v2.5 | One-click unsubscribe |
| FR-SOCIAL-08 | Anonymous visitors read all public content | v1 | Login gates writing, never reading |
| FR-SOCIAL-09 | Anti-spam: rate limits, word filter, moderation switch | v1.5 | See 6.4 |

### 4.7 Admin (FR-ADMIN)

Core of v1. All screens designed from 375px up.

| ID | Requirement | Version | Acceptance |
|---|---|---|---|
| FR-ADMIN-01 | Login and authorisation | v1 | Non-owner requests to `/admin/*` return 404 |
| FR-ADMIN-02 | Post list grouped by state | v1 | One-handed on a phone |
| FR-ADMIN-03 | Markdown editor with preview toggle | v1 | Editing area not obscured by the on-screen keyboard |
| FR-ADMIN-04 | Draft autosave | v1 | Every 10s and on blur |
| FR-ADMIN-05 | Image upload: library, camera, paste | v1 | Markdown syntax inserted automatically |
| FR-ADMIN-06 | Compression and conversion on upload | v1 | WebP or AVIF, long-edge limit, GPS EXIF stripped |
| FR-ADMIN-07 | Publish, unpublish, schedule | v1 | Scheduling may slip to v1.5 |
| FR-ADMIN-08 | Media library management | v1 | Browse, copy link, delete |
| FR-ADMIN-09 | Mobile Markdown toolbar | v1 | One-tap `#`, `**`, `[]()` |
| FR-ADMIN-10 | Offline tolerance | v1.5 | Content persists locally, resumes after reconnect |
| FR-ADMIN-11 | Quick moment composer | v1.5 | Lighter than the post editor |
| FR-ADMIN-12 | Item entry with cover fetch | v2 | |
| FR-ADMIN-13 | Batch photo upload with EXIF extraction | v2.5 | |
| FR-ADMIN-14 | Comment and whisper moderation | v1.5 | |
| FR-ADMIN-15 | Installable as a PWA | v1.5 | Add to home screen |

---

## 5. Data model (draft)

Prisma syntax. Fields are cheap to add; relations are not — review those first.

1. All four life-list categories share one `Item` table, discriminated by `type`, category-specific fields in `meta`. See ADR-0002.
2. Comments are polymorphic (`targetType` + `targetId`), serving posts, moments, items, photos.
3. All images go through `Media`. Business tables store a Media id, so compression, CDN, and cleanup live in one place.

```prisma
// ---------- Users ----------
model User {
  id            String    @id @default(cuid())
  email         String?   @unique
  name          String?
  avatarUrl     String?
  role          Role      @default(VISITOR)
  createdAt     DateTime  @default(now())
  lastSeenAt    DateTime?
  accounts      Account[]      // Better Auth provider links
  sessions      Session[]
  comments      Comment[]
  itemRatings   ItemRating[]
  whispers      Whisper[]
  subscription  Subscription?
}

enum Role { OWNER VISITOR }

// ---------- Media ----------
model Media {
  id         String   @id @default(cuid())
  storageKey String   @unique
  url        String                    // public URL on the project domain
  mimeType   String
  width      Int
  height     Int
  sizeBytes  Int
  blurhash   String?                   // placeholder, prevents layout shift
  alt        String?
  exif       Json?                     // gallery only
  createdAt  DateTime @default(now())
}

// ---------- Blog ----------
model Post {
  id          String     @id @default(cuid())
  slug        String     @unique
  title       String
  summary     String?
  content     String                    // Markdown source
  coverId     String?
  cover       Media?     @relation(fields: [coverId], references: [id])
  status      PubStatus  @default(DRAFT)
  visibility  Visibility @default(PUBLIC)   // reserved; PUBLIC in v1
  publishedAt DateTime?
  updatedAt   DateTime   @updatedAt
  createdAt   DateTime   @default(now())
  readingMin  Int?
  seriesId    String?
  tags        Tag[]      @relation("PostTags")
  viewCount   Int        @default(0)
}

enum PubStatus  { DRAFT SCHEDULED PUBLISHED ARCHIVED }
enum Visibility { PUBLIC MEMBER FRIEND PRIVATE }

// ---------- Moments ----------
model Moment {
  id         String     @id @default(cuid())
  content    String                       // short text, light Markdown
  images     Media[]    @relation("MomentImages")
  place      String?                      // plain text, no map API
  mood       String?
  visibility Visibility @default(PUBLIC)
  createdAt  DateTime   @default(now())
}

// ---------- Life list ----------
model Item {
  id            String     @id @default(cuid())
  type          ItemType
  title         String
  originalTitle String?
  year          Int?
  creator       String?                     // director / author / studio / country
  coverId       String?
  cover         Media?     @relation(fields: [coverId], references: [id])
  externalId    String?                     // TMDB / IGDB / OpenLibrary
  externalUrl   String?
  status        ItemStatus @default(WISHLIST)
  myRating      Float?                      // 0.5-5.0, half steps
  myShort       String?                     // shown on the card
  myReview      String?                     // Markdown, detail page
  startedAt     DateTime?
  finishedAt    DateTime?
  meta          Json?                       // runtime, pages, platform, coordinates
  tags          Tag[]      @relation("ItemTags")
  photos        Media[]    @relation("ItemPhotos")
  visitorRatings ItemRating[]
  visibility    Visibility @default(PUBLIC)
  sortWeight    Int        @default(0)
  createdAt     DateTime   @default(now())
}

enum ItemType   { MOVIE BOOK GAME PLACE }
enum ItemStatus { DONE DOING WISHLIST }

model ItemRating {
  id        String   @id @default(cuid())
  itemId    String
  item      Item     @relation(fields: [itemId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  score     Float
  comment   String?
  createdAt DateTime @default(now())
  @@unique([itemId, userId])   // one editable rating per user per item
}

// ---------- Gallery ----------
model Photo {
  id         String   @id @default(cuid())
  mediaId    String   @unique
  media      Media    @relation(fields: [mediaId], references: [id])
  title      String?
  story      String?
  category   PhotoCat
  albumId    String?
  album      Album?   @relation(fields: [albumId], references: [id])
  shotAt     DateTime?
  place      String?
  featured   Boolean  @default(false)
  sortWeight Int      @default(0)
}

enum PhotoCat { LANDSCAPE PORTRAIT DOCUMENTARY STREET OTHER }

model Album {
  id       String  @id @default(cuid())
  slug     String  @unique
  title    String
  intro    String?
  coverId  String?
  photos   Photo[]
}

// ---------- Interaction ----------
model Comment {
  id         String        @id @default(cuid())
  targetType CommentTarget
  targetId   String                        // polymorphic: no FK, enforced in the app layer
  userId     String
  user       User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  parentId   String?                       // one level of threading
  content    String
  status     CommentStatus @default(VISIBLE)
  createdAt  DateTime      @default(now())
  @@index([targetType, targetId])
}

enum CommentTarget { POST MOMENT ITEM PHOTO }
enum CommentStatus { VISIBLE HIDDEN PENDING }

model Whisper {
  id        String   @id @default(cuid())
  userId    String?                         // anonymous allowed
  user      User?    @relation(fields: [userId], references: [id])
  content   String
  contact   String?
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())
}

model Subscription {
  id        String   @id @default(cuid())
  userId    String   @unique
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  byEmail   Boolean  @default(true)
  token     String   @unique                // one-click unsubscribe
  createdAt DateTime @default(now())
}

model Tag {
  id      String   @id @default(cuid())
  slug    String   @unique
  name    String
  posts   Post[]   @relation("PostTags")
  items   Item[]   @relation("ItemTags")
}
```

Open question: repeat experiences collapse into one record with a single `finishedAt`. Multiple occurrences need a separate `ItemLog` table. See OQ-06.

---

## 6. Non-functional requirements

### 6.1 Mainland China accessibility (hard constraint)

Every rule is blocking. Violating one prevents mainland visitors from loading the site or logging in.

| ID | Rule | Reason |
|---|---|---|
| NFR-CN-01 | No Google Fonts, `fonts.googleapis.com`, `fonts.gstatic.com` | Blocked; render-blocking stylesheet stalls the page. Self-host fonts and subset CJK |
| NFR-CN-02 | No Google Analytics, reCAPTCHA, Tag Manager | Blocked; slows every page |
| NFR-CN-03 | Google login is never the only or default method | Mainland visitors hang. Secondary placement, with a warning |
| NFR-CN-04 | Primary login is a 6-digit email code, not a magic link | Chinese mail providers rewrite external links. Configure SPF, DKIM, DMARC; prompt users to check spam |
| NFR-CN-05 | Custom domain required; never expose provider domains such as `*.vercel.app` or `*.workers.dev` | Provider domains may be unreliable in mainland China |
| NFR-CN-06 | Image CDN uses a custom domain, not `*.r2.dev` | Same |
| NFR-CN-07 | Verify every third-party script is reachable before launch | Comments, analytics, maps, fonts, emoji: any one breaks the page |
| NFR-CN-08 | First paint never depends on third-party resources | The body renders even if a third party is down |
| NFR-CN-09 | No ICP filing; 2–5s first paint accepted | Filing needs a domestic entity, and personal filings forbid interactive features |
| NFR-CN-10 | A mainland tester completes load, browse, register, log in, comment before launch | The only reliable verification |

Vercel Preview is the current development environment under ADR-0008. Production hosting remains provisional. Keep compute and Neon in nearby regions where the selected platform permits.

### 6.2 Performance

- LCP under 1.5s in the UK, under 5s in mainland China.
- Lighthouse performance 90+ desktop, 80+ mobile.
- Images: multiple sizes, lazy-loaded, explicit dimensions. Never serve originals.
- First-load JS under 200KB gzipped.

### 6.3 Responsive and compatibility

- Breakpoints 375 / 768 / 1024 / 1440. The admin is designed upward from 375px, not scaled down.
- Two most recent major versions of Chrome, Safari, Edge, Firefox, including iOS Safari.
- Minimum touch target 44×44px.

### 6.4 Security and anti-spam

- Admin routes are authorised server-side, never by hiding UI.
- Escape or sanitise all user-submitted content before rendering.
- Rate-limit comments, whispers, and login-code sends (3 per minute per IP).
- Validate real file type and size on upload; strip GPS EXIF.
- CSRF protection on sensitive operations.
- Secrets live in environment variables, never in the repository.

### 6.5 Privacy and compliance (GDPR applies)

- `/privacy` states what is collected, why, for how long, and how to delete it.
- Users can delete their account and all data themselves.
- Analytics MUST be cookie-free, so no consent banner is required.
- Identifiable people in photographs require usage permission.

### 6.6 Budget

Target £15–30 per year before paid compute. Cloudflare Workers Paid adds at least $60 per year and requires explicit approval.

| Item | Choice | Cost |
|---|---|---|
| Domain | Cloudflare Registrar / Namecheap | £10–15 / year |
| Hosting | Vercel Preview; production host provisional | Free during preview; production cost pending |
| Database | Neon free tier | Free, 0.5GB |
| Image storage | Cloudflare R2 | Free under 10GB, no egress fees |
| Email | Resend free tier | 3000 / month |
| Analytics | None in v1 | Free |

Gallery growth will exceed the R2 free tier; overage is ~$0.015/GB/month.

---

## 7. Technology

`Confirmed` choices are implementation defaults. `Provisional` choices follow the validation boundary named in their decision.

| Layer | Choice | Version | Status | Decision |
|---|---|---|---|---|
| Framework | Next.js App Router | 16.x | Confirmed | One application for pages, server routes, and admin |
| Language | TypeScript, strict mode | Current compatible | Confirmed | Required for all application code |
| Styling | Tailwind CSS plus custom CSS | v4 | Confirmed | Utilities for admin; custom CSS is allowed for the public visual system |
| Components | shadcn/ui and Radix | Current compatible | Confirmed | Admin primitives only; do not impose the library on public pages |
| Database | PostgreSQL on Neon, Singapore | Current managed service | Confirmed | Relational source of truth close to the target deployment region |
| ORM | Prisma | 7.x candidate | Provisional | Confirm the current production release, runtime adapter, and migration path during bootstrap |
| Authentication | Better Auth with email OTP | Current compatible | Confirmed | Six-digit email codes and database sessions; see ADR-0004 |
| Object storage | Cloudflare R2 on a custom domain | Current managed service | Confirmed | Store all uploaded media behind the project domain |
| Image pipeline | Application-led | — | Provisional | Validate against representative media workloads without blocking unrelated features; see ADR-0008 |
| Content | Pure Markdown with remark, rehype, and Shiki | Current compatible | Confirmed | Markdown is authoritative; MDX is excluded; see ADR-0005 |
| Editor | Text area, preview, and mobile toolbar | — | Confirmed | Keep authoring portable and dependency-light; see ADR-0005 |
| Email | Resend | Current managed service | Confirmed | Release requires successful code delivery to QQ Mail and 163 Mail |
| Hosting | Vercel Preview for development; production host unselected | — | Provisional | Use Git previews now and reassess after representative features; see ADR-0008 |
| Analytics | None in v1 | — | Confirmed | Reconsider cookie-free analytics in v1.5 |
| Code quality | ESLint, Prettier, Husky, lint-staged | Current compatible | Confirmed | Run local checks before user commits |
| CI | GitHub Actions | — | Confirmed | Run lint, type checks, tests, and a production build on every PR |
| Motion | Motion | Current compatible | Provisional | Confirm after OQ-02 defines the visual direction |

Workflow: `CONTRIBUTING.md`. AI rules: `AGENTS.md`.

---

## 8. Open questions

| ID | Question | Impact | Decide by |
|---|---|---|---|
| OQ-01 | Resolved: `fangmingluan.com` is the formal host; `life.fangmingluan.com` is reserved for personal content | Site, email, SEO | Closed 2026-09-01 |
| OQ-02 | Partially resolved: formal pages are restrained; personal pages may use an opening sequence, expressive colour, and richer motion. Exact references, palette, type, and motion remain open | All design work | Before personal-space implementation |
| OQ-03 | Resolved: pure Markdown with preview and a mobile toolbar | FR-ADMIN-03 | Closed 2026-08-31; ADR-0005 |
| OQ-04 | Rating scale: 5 stars with halves, 10-point, or none | FR-LIFE-04 data type | Before v2 |
| OQ-05 | Resolved: v1 is English-only and unprefixed; future locales use explicit path prefixes | FR-HOME-09, architectural | Closed 2026-09-01; ADR-0007 |
| OQ-06 | Track repeat experiences | Whether to split out `ItemLog` | Before v2 |
| OQ-07 | Watermark or right-click protection | FR-GALLERY-09 | Before v2.5 |
| OQ-08 | Resolved: do not publish a CV in v1; add it after the source document is complete and reviewed | FR-HOME-05 | Closed 2026-09-01 |
| OQ-09 | Resolved: build against a fixed content structure and add source content incrementally; no v1 bulk import | Content preparation | Closed 2026-09-01; `launch-content.md` |
| OQ-10 | Allow fully anonymous whispers | FR-SOCIAL-06 | Before v2.5 |

---

## Change log

| Date | Version | Change |
|---|---|---|
| 2026-08-29 | v0.1 | First draft. Full-stack route, four release tiers, data model, China-accessibility constraint |
| 2026-08-29 | v0.2 | Split architecture into its own file; added `adr/` and `tech-debt.md` |
| 2026-08-30 | v0.3 | Removed learning-goal sections |
| 2026-08-30 | v0.4 | Condensed to concise technical English. No requirements changed |
| 2026-08-31 | v0.5 | Recorded the confirmed technology baseline and isolated platform-dependent choices |
| 2026-08-31 | v0.6 | Aligned FR-AUTH with ADR-0004: owner email login and session persistence move to v1; visitor access and GitHub login remain in v1.5 |
| 2026-09-01 | v0.7 | Fixed launch hosts, locale URLs, homepage structure, CV policy, visual boundaries, and incremental content preparation |
| 2026-09-03 | v0.8 | Adopted Vercel-first preview delivery without selecting the permanent production host |
