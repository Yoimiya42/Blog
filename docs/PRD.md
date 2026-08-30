# Personal Site — Product Requirements

> v0.4 · 2026-08-30 · Draft
> Single source of requirements. No feature is implemented without an entry here.

---

## 1. Positioning

A restrained, professional academic and career homepage, with a private interest space behind a quiet entrance.

### 1.1 Audiences

| ID | Audience | Goal | Entry points | Priority |
|---|---|---|---|---|
| P1 | Recruiters, professors, peers | Judge credibility in 30 seconds | Homepage, blog | Highest |
| P2 | Friends | See what the owner is doing and consuming | Moments, life list, gallery | High |
| P3 | Passing strangers | Arrive via one post or photo, discover the rest | Whole site | Medium |
| P4 | The owner | A durable place to record, updatable from anywhere | Admin | Highest |

### 1.2 Success criteria

- A P1 visitor can state who the owner is, what they can do, and what they have built.
- Publishing a post from a phone takes under 5 minutes.
- The site is still being updated six months after launch.

### 1.3 Design principles

1. **Two personas.** Formal outer layer, personal inner layer, with visually distinct languages and a deliberate transition between them.
2. **Mobile-first.** The admin is designed to write on, not only to read on. Design starts at 375px.
3. **Content first.** No effect may delay first paint or disrupt reading.
4. **Low maintenance cost.** Prefer fewer features over heavier process. The cost of adding one entry determines the lifespan of the site.
5. **Reachable from mainland China.** See 6.1.
6. **Reserve for identified change, not for speculation.** See `architecture.md` section 1.

---

## 2. Scope

### 2.1 v1 — MVP, launch by 2026-09-30

- Formal homepage (P1 landing page)
- Technical blog (list, detail, tags)
- Admin (mobile-first: write, upload images, publish)
- Domain, deployment, account skeleton (owner only), first version of the hidden entrance

Excluded from v1: life list, gallery, moments, visitor login, comments, ratings, whispers, subscriptions, dark mode, i18n.

### 2.2 v1.5 — around 2026-10

- Moments (short posts with images, optimised for publishing from a phone)
- Visitor login (GitHub + email code)
- Comments (polymorphic, one implementation for all content types)

### 2.3 v2 — around 2026-11 to 2026-12

- Life list: films, books, games, places
- Visitor ratings and short reviews on items
- Cover and metadata fetch scripts

### 2.4 v2.5 — early 2027

- Photo gallery (categories, EXIF, lightbox, masonry)
- Whisper inbox
- Update subscriptions (email and on-site)
- Dark mode, RSS, travel map

### 2.5 Out of scope, all versions

- Multi-user publishing. Only the owner publishes content.
- Two-way messaging. Whispers are one-way (visitor to owner).
- ICP filing and mainland hosting. Slower mainland access is accepted.
- Visibility tiers (member-only, friends-only). The `visibility` column is reserved so this can be added without restructuring.
- Native mobile app. Responsive web only.

---

## 3. Information architecture

### 3.1 Sitemap

| URL | Page | Version | Notes |
|---|---|---|---|
| `/` | Homepage | v1 | Main entry, formal CV style |
| `/blog` | Blog list | v1 | Paginated, filterable by tag |
| `/blog/[slug]` | Post detail | v1 | Slug derived from title, frozen once published |
| `/blog/tags/[tag]` | Tag archive | v1 | |
| `/admin` | Admin home | v1 | Auth required, mobile-first |
| `/admin/posts` | Post management | v1 | List, create, edit, delete |
| `/admin/posts/[id]/edit` | Editor | v1 | |
| `/admin/media` | Media library | v1 | |
| `/moments` | Moments | v1.5 | Reverse-chronological feed |
| `/life` | Life list overview | v2 | Four categories plus stats |
| `/life/movies` `/life/books` `/life/games` `/life/places` | Category lists | v2 | Cover-led card grid |
| `/life/[type]/[id]` | Item detail | v2 | Owner review, rating, visitor comments |
| `/gallery` | Gallery | v2.5 | |
| `/gallery/[category]` | Category gallery | v2.5 | landscape / portrait / documentary |
| `/gallery/[id]` | Single photo | v2.5 | Large view, EXIF, story |
| `/whisper` | Whisper form | v2.5 | |
| `/login` | Login | v1.5 | |
| `/api/*` | API routes | v1 | |
| `/rss.xml` `/sitemap.xml` | Feed and index | v1.5 | |

**URLs are permanent once published.** Changing them breaks inbound links and search indexing. This is a hard rule.

### 3.2 Hidden entrance

The entrance must not distract P1 visitors but must reward curiosity.

- **Placement**: homepage footer, a small unlabelled glyph.
- **Feedback**: subtle response on hover or long press.
- **Transition**: 600–900ms full-page transition, not a standard navigation.
- **Target**: `/moments`, falling back to `/blog` in v1. The inner layer uses a different visual language and provides an equally quiet exit back.
- **Accessibility**: keyboard reachable (Tab, Enter) with an `aria-label`.

---

## 4. Functional requirements

ID format: `FR-<module>-<n>`. Each row carries its own acceptance criteria.

### 4.1 Homepage (FR-HOME)

| ID | Requirement | Version | Acceptance |
|---|---|---|---|
| FR-HOME-01 | Name, one-line identity, contact entry | v1 | Visible above the fold on a portrait phone |
| FR-HOME-02 | Education (UCL BSc CS) | v1 | School, degree, dates, optional GPA and course highlights |
| FR-HOME-03 | Projects and experience | v1 | Title, dates, stack, one-line outcome, external link |
| FR-HOME-04 | Skills, grouped by category | v1 | No percentage bars |
| FR-HOME-05 | Contact and external links | v1 | Email, GitHub, LinkedIn, optional CV download |
| FR-HOME-06 | Three most recent posts | v1 | Demonstrates ongoing output |
| FR-HOME-07 | Hidden entrance | v1 | See 3.2 |
| FR-HOME-08 | Homepage content editable in admin | v1.5 | Hardcoding is acceptable in v1 |
| FR-HOME-09 | EN/ZH toggle | v2 | Pending, see section 8 |

**Constraint**: this page serves a 30-second judgement. High information density, clear hierarchy, no background animation, no autoplay video.

### 4.2 Blog (FR-BLOG)

| ID | Requirement | Version | Acceptance |
|---|---|---|---|
| FR-BLOG-01 | Post list, reverse-chronological, paginated | v1 | 10 per page; title, summary, date, tags, reading time |
| FR-BLOG-02 | Post detail | v1 | Markdown renders correctly; CJK typography at line-height 1.75+, 17–18px |
| FR-BLOG-03 | Code highlighting | v1 | Python, TS, Java, C, Go; language label and copy button |
| FR-BLOG-04 | Tags and tag archive | v1 | Many tags per post |
| FR-BLOG-05 | Table of contents | v1 | Fixed sidebar with scroll spy on desktop, collapsed on mobile |
| FR-BLOG-06 | Draft and published states | v1 | Drafts hidden from public lists, reachable via preview link |
| FR-BLOG-07 | Images | v1 | Lazy-loaded, explicit dimensions, click to enlarge |
| FR-BLOG-08 | Math | v1.5 | KaTeX |
| FR-BLOG-09 | Full-text search | v2 | Client-side first; revisit past 100 posts |
| FR-BLOG-10 | Post series | v2 | Previous and next within a series |
| FR-BLOG-11 | Comments | v1.5 | See 4.6 |
| FR-BLOG-12 | RSS | v1.5 | |

### 4.3 Moments (FR-MOMENT)

| ID | Requirement | Version | Acceptance |
|---|---|---|---|
| FR-MOMENT-01 | Reverse-chronological feed | v1.5 | No titles; body, images, timestamp |
| FR-MOMENT-02 | 0–9 images per entry | v1.5 | Grid layout, tap for fullscreen carousel |
| FR-MOMENT-03 | Light Markdown (bold, link, line break) | v1.5 | No headings or code blocks |
| FR-MOMENT-04 | Optional place and mood | v1.5 | Plain text, no map API |
| FR-MOMENT-05 | Fast publishing from a phone | v1.5 | 5 interactions or fewer from opening the admin to publishing |
| FR-MOMENT-06 | Infinite scroll | v1.5 | |
| FR-MOMENT-07 | Comments | v1.5 | |

### 4.4 Life list (FR-LIFE)

Films, books, games, and places share one data structure and one component set, discriminated by `type`. See ADR-0002.

| ID | Requirement | Version | Acceptance |
|---|---|---|---|
| FR-LIFE-01 | Cover-led card grid | v2 | Missing covers use a consistent placeholder without breaking layout |
| FR-LIFE-02 | Status: done, in progress, wishlist | v2 | Filterable; wishlist is the core of the backlog view |
| FR-LIFE-03 | Item detail page | v2 | Cover, basics, owner rating, long review, completion date |
| FR-LIFE-04 | Rating scale | v2 | 5 stars with half steps, see section 8 |
| FR-LIFE-05 | Short review separate from long review | v2 | Short on the card, long on the detail page |
| FR-LIFE-06 | Sort and filter | v2 | By rating, completion date, year, tag |
| FR-LIFE-07 | Stats overview | v2 | Count per year, average rating, rating distribution |
| FR-LIFE-08 | Automatic cover and metadata fetch | v2 | Entering a title populates cover, year, creator |
| FR-LIFE-09 | Extra fields for places | v2 | Country, city, visit dates, linked photos |
| FR-LIFE-10 | Travel map view | v2.5 | Visited places highlighted |
| FR-LIFE-11 | Visitor ratings and short reviews | v2 | See 4.6 |

**Data sources**: TMDB for films, Google Books or Open Library for books, IGDB for games (requires a Twitch account), owner photos for places. Douban has no public API and is not used. Fetched covers MUST be downloaded into project storage, never hotlinked: external links expire and are unreliable from mainland China.

### 4.5 Gallery (FR-GALLERY)

| ID | Requirement | Version | Acceptance |
|---|---|---|---|
| FR-GALLERY-01 | Categories: landscape, portrait, documentary | v2.5 | Extensible |
| FR-GALLERY-02 | Masonry or grid at original aspect ratio | v2.5 | No layout shift on load |
| FR-GALLERY-03 | Progressive loading | v2.5 | blurhash or LQIP placeholder |
| FR-GALLERY-04 | Fullscreen viewer | v2.5 | Keyboard and gesture navigation |
| FR-GALLERY-05 | EXIF display | v2.5 | Camera, lens, aperture, shutter, ISO, focal length, date |
| FR-GALLERY-06 | Optional per-photo story | v2.5 | Hidden when empty |
| FR-GALLERY-07 | Albums | v2.5 | Photos from one trip group together |
| FR-GALLERY-08 | Responsive multi-size output | v2.5 | Phones never download the 4000px original |
| FR-GALLERY-09 | Watermark and right-click protection | v2.5 | Pending, see section 8 |

### 4.6 Accounts and interaction (FR-AUTH / FR-SOCIAL)

| ID | Requirement | Version | Acceptance |
|---|---|---|---|
| FR-AUTH-01 | Email login with a 6-digit code | v1.5 | Primary method, see 6.1 |
| FR-AUTH-02 | GitHub login | v1.5 | For technical visitors |
| FR-AUTH-03 | Google login | v2 | Secondary, labelled as requiring network access |
| FR-AUTH-04 | Owner account | v1 | `role = OWNER`, the only account with admin access |
| FR-AUTH-05 | Session persistence and logout | v1.5 | 30-day session |
| FR-AUTH-06 | Self-service account and data deletion | v1.5 | GDPR, see 6.5 |
| FR-SOCIAL-01 | Comments on posts, moments, items, photos | v1.5 | Polymorphic, one implementation |
| FR-SOCIAL-02 | One level of threaded replies | v1.5 | No unlimited nesting |
| FR-SOCIAL-03 | Owner can delete or hide any comment | v1.5 | Single action in admin |
| FR-SOCIAL-04 | New-comment notification | v1.5 | Email or admin badge |
| FR-SOCIAL-05 | Visitor rating and short review on items | v2 | Displayed separately from the owner rating |
| FR-SOCIAL-06 | Whispers: private messages to the owner | v2.5 | Anonymous allowed, with abuse protection |
| FR-SOCIAL-07 | Email notification for new posts | v2.5 | One-click unsubscribe link |
| FR-SOCIAL-08 | Anonymous visitors can read all public content | v1 | Login gates writing, never reading |
| FR-SOCIAL-09 | Anti-spam: rate limits, word filter, moderation switch | v1.5 | See 6.4 |

### 4.7 Admin (FR-ADMIN)

The admin is the core of v1. **All screens are designed from 375px up.**

| ID | Requirement | Version | Acceptance |
|---|---|---|---|
| FR-ADMIN-01 | Login and authorisation | v1 | Non-owner requests to `/admin/*` return 404 |
| FR-ADMIN-02 | Post list grouped by draft and published | v1 | One-handed operation on a phone |
| FR-ADMIN-03 | Markdown editor with preview toggle | v1 | The editing area is not obscured by the on-screen keyboard |
| FR-ADMIN-04 | Draft autosave | v1 | Every 10s and on blur; content is never lost |
| FR-ADMIN-05 | Image upload from library, camera, or paste | v1 | Markdown image syntax inserted automatically |
| FR-ADMIN-06 | Automatic compression and conversion | v1 | WebP or AVIF, long-edge limit, GPS EXIF stripped |
| FR-ADMIN-07 | Publish, unpublish, schedule | v1 | Scheduling may slip to v1.5 |
| FR-ADMIN-08 | Media library management | v1 | Browse, copy link, delete |
| FR-ADMIN-09 | Mobile Markdown toolbar | v1 | One-tap insertion of `#`, `**`, `[]()` |
| FR-ADMIN-10 | Offline tolerance | v1.5 | Content persists locally and resumes after reconnect |
| FR-ADMIN-11 | Quick moment composer | v1.5 | Lighter than the post editor |
| FR-ADMIN-12 | Item entry with cover fetch | v2 | |
| FR-ADMIN-13 | Batch photo upload with EXIF extraction | v2.5 | |
| FR-ADMIN-14 | Comment and whisper moderation | v1.5 | |
| FR-ADMIN-15 | Installable as a PWA | v1.5 | Add to home screen |

---

## 5. Data model (draft)

Expressed in Prisma. Fields can be added later; **relationships are expensive to change**, so review those first.

Three structural decisions:

1. **All four life-list categories share one `Item` table**, discriminated by `type`, with category-specific fields in a `meta` JSON column. See ADR-0002.
2. **Comments are polymorphic** (`targetType` + `targetId`), so one implementation serves posts, moments, items, and photos.
3. **All images go through one `Media` table.** Business tables store only a Media id, so compression, CDN, and cleanup are handled in one place.

```prisma
// ---------- Users and permissions ----------
model User {
  id            String    @id @default(cuid())
  email         String?   @unique
  name          String?
  avatarUrl     String?
  role          Role      @default(VISITOR)   // OWNER | VISITOR
  createdAt     DateTime  @default(now())
  lastSeenAt    DateTime?
  accounts      Account[]      // Auth.js provider links
  sessions      Session[]
  comments      Comment[]
  itemRatings   ItemRating[]
  whispers      Whisper[]
  subscription  Subscription?
}

enum Role { OWNER VISITOR }

// ---------- Unified media assets ----------
model Media {
  id         String   @id @default(cuid())
  storageKey String   @unique          // object storage key
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
  content     String                    // Markdown / MDX source
  coverId     String?
  cover       Media?     @relation(fields: [coverId], references: [id])
  status      PubStatus  @default(DRAFT)
  visibility  Visibility @default(PUBLIC)   // reserved; always PUBLIC in v1
  publishedAt DateTime?
  updatedAt   DateTime   @updatedAt
  createdAt   DateTime   @default(now())
  readingMin  Int?
  seriesId    String?
  tags        Tag[]      @relation("PostTags")
  viewCount   Int        @default(0)
}

enum PubStatus  { DRAFT SCHEDULED PUBLISHED ARCHIVED }
enum Visibility { PUBLIC MEMBER FRIEND PRIVATE }   // v1 uses PUBLIC and PRIVATE only

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

// ---------- Life list, shared across four categories ----------
model Item {
  id            String     @id @default(cuid())
  type          ItemType                    // MOVIE | BOOK | GAME | PLACE
  title         String
  originalTitle String?
  year          Int?
  creator       String?                     // director / author / studio / country
  coverId       String?
  cover         Media?     @relation(fields: [coverId], references: [id])
  externalId    String?                     // TMDB / IGDB / OpenLibrary id
  externalUrl   String?
  status        ItemStatus @default(WISHLIST)  // DONE | DOING | WISHLIST
  myRating      Float?                      // 0.5-5.0, half-star steps
  myShort       String?                     // one-line review, shown on the card
  myReview      String?                     // long review, Markdown, detail page
  startedAt     DateTime?
  finishedAt    DateTime?
  meta          Json?                       // type-specific: runtime, pages, platform, coordinates
  tags          Tag[]      @relation("ItemTags")
  photos        Media[]    @relation("ItemPhotos")   // owner photos for places
  visitorRatings ItemRating[]
  visibility    Visibility @default(PUBLIC)
  sortWeight    Int        @default(0)
  createdAt     DateTime   @default(now())
}

enum ItemType   { MOVIE BOOK GAME PLACE }
enum ItemStatus { DONE DOING WISHLIST }

// Visitor ratings, stored separately from the owner rating
model ItemRating {
  id        String   @id @default(cuid())
  itemId    String
  item      Item     @relation(fields: [itemId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  score     Float
  comment   String?
  createdAt DateTime @default(now())
  @@unique([itemId, userId])   // one rating per user per item, editable
}

// ---------- Gallery ----------
model Photo {
  id         String   @id @default(cuid())
  mediaId    String   @unique
  media      Media    @relation(fields: [mediaId], references: [id])
  title      String?
  story      String?                    // optional
  category   PhotoCat                   // LANDSCAPE | PORTRAIT | DOCUMENTARY
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
  targetType CommentTarget                 // POST | MOMENT | ITEM | PHOTO
  targetId   String                        // polymorphic: no FK, enforced in the app layer
  userId     String
  user       User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  parentId   String?                       // one level of threading
  content    String
  status     CommentStatus @default(VISIBLE)  // VISIBLE | HIDDEN | PENDING
  createdAt  DateTime      @default(now())
  @@index([targetType, targetId])
}

enum CommentTarget { POST MOMENT ITEM PHOTO }
enum CommentStatus { VISIBLE HIDDEN PENDING }

model Whisper {                             // one-way, owner-only visibility
  id        String   @id @default(cuid())
  userId    String?                         // anonymous allowed
  user      User?    @relation(fields: [userId], references: [id])
  content   String
  contact   String?                         // optional contact for anonymous senders
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

**Open modelling question**: repeat experiences (rereading a book, revisiting a place) currently collapse into one record with a single `finishedAt`. Supporting multiple occurrences requires a separate `ItemLog` table. See OQ-06.

---

## 6. Non-functional requirements

### 6.1 Mainland China accessibility (hard constraint)

Every rule below is blocking. Violating any one of them prevents mainland visitors from loading the site or logging in.

| ID | Rule | Reason |
|---|---|---|
| NFR-CN-01 | No Google Fonts, `fonts.googleapis.com`, or `fonts.gstatic.com` | Blocked; the browser stalls on a render-blocking stylesheet. Fonts MUST be self-hosted, and CJK fonts MUST be subsetted |
| NFR-CN-02 | No Google Analytics, reCAPTCHA, or Tag Manager | Blocked, and slows the whole site |
| NFR-CN-03 | Google login MUST NOT be the only or default method | Mainland visitors hang. Place it secondary with a warning |
| NFR-CN-04 | Primary login is a 6-digit email code, not a magic link | Chinese mail providers rewrite or strip external links. Configure SPF, DKIM, DMARC, and prompt users to check spam |
| NFR-CN-05 | A custom domain is required; never expose `*.vercel.app` | Poisoned in mainland China |
| NFR-CN-06 | The image CDN MUST use a custom domain, not `*.r2.dev` | Same |
| NFR-CN-07 | Every third-party script MUST be verified reachable before launch | Comments, analytics, maps, fonts, emoji: any one can break the site |
| NFR-CN-08 | First paint MUST NOT depend on third-party resources | The page body renders even if a third party is down |
| NFR-CN-09 | No ICP filing; slower mainland access is accepted (2–5s first paint) | Filing requires a domestic entity and address, and personal filings usually forbid interactive features |
| NFR-CN-10 | A mainland tester MUST complete load, browse, register, log in, comment before launch | The only reliable verification |

**Deployment region**: Vercel Hong Kong or Singapore, balancing mainland and UK latency. The database MUST sit in the same region to avoid cross-region round trips.

### 6.2 Performance

- LCP: under 1.5s in the UK, under 5s in mainland China.
- Lighthouse performance: 90+ desktop, 80+ mobile.
- Images: multiple sizes, lazy-loaded, explicit dimensions. Never serve originals.
- Per-page JS on first load: under 200KB gzipped.

### 6.3 Responsive and compatibility

- Breakpoints: 375 / 768 / 1024 / 1440.
- The admin is designed from 375px up, not scaled down from desktop.
- Support the two most recent major versions of Chrome, Safari, Edge, Firefox, including iOS Safari.
- Minimum touch target: 44×44px.

### 6.4 Security and anti-spam

- Admin routes are authorised server-side, never by hiding UI.
- All user-submitted content is escaped or sanitised before rendering.
- Rate-limit comments, whispers, and login-code sends (for example 3 per minute per IP).
- Validate real file type and size on upload; strip GPS EXIF.
- CSRF protection on sensitive operations.
- Secrets live in environment variables and never enter the repository.

### 6.5 Privacy and compliance (GDPR applies)

- A `/privacy` page states what is collected, why, for how long, and how to delete it.
- Users can delete their account and all associated data themselves.
- Analytics MUST be cookie-free (for example Umami) so no consent banner is required.
- Identifiable people in photographs require usage permission.

### 6.6 Budget

Target **£15–30 per year**, mostly the domain.

| Item | Choice | Cost |
|---|---|---|
| Domain | Cloudflare Registrar / Namecheap | £10–15 per year |
| Hosting | Vercel Hobby | Free, non-commercial |
| Database | Neon free tier | Free, 0.5GB |
| Image storage | Cloudflare R2 | Free under 10GB, no egress fees |
| Email | Resend free tier | 3000 per month free |
| Analytics | Umami Cloud / Vercel Analytics | Free tier |

Gallery growth will eventually exceed the R2 free tier. Overage is about $0.015/GB/month.

---

## 7. Technology

| Layer | Choice | Version | Reason |
|---|---|---|---|
| Framework | Next.js (App Router) | 15.x | Pages, API, and admin in one project; largest ecosystem |
| Language | TypeScript (strict) | 5.x | Types keep a growing project controllable |
| Styling | Tailwind CSS | v4 | Fast, constrained, pairs with design tokens |
| Components | shadcn/ui + Radix | — | Source lives in the repo and can be restyled fully |
| Database | PostgreSQL on Neon | — | Relational, free tier, serverless-friendly |
| ORM | Prisma | 6.x | Schema is documentation; mature migrations |
| Auth | Auth.js (NextAuth) | v5 | Multiple providers, sessions, and security handled |
| Object storage | Cloudflare R2 | — | No egress fees, custom domain (NFR-CN-06) |
| Image pipeline | sharp + next/image | — | WebP conversion, multiple sizes, blurhash |
| Editor | Pending, see section 8 | — | Key v1 decision |
| Markdown | remark / rehype + Shiki | — | Build-time highlighting, zero client cost |
| Email | Resend | — | Login codes and notifications |
| Hosting | Vercel (HK or SG) | — | Push to deploy; see NFR-CN-05 |
| Analytics | Umami Cloud | — | Cookie-free, no consent banner |
| Code quality | ESLint + Prettier + Husky | — | Pre-commit checks |
| CI | GitHub Actions | — | Lint and build on every PR |
| Motion | Motion (formerly Framer Motion) | — | Hidden-entrance and page transitions |

Repository workflow is defined in `CONTRIBUTING.md`; AI-specific rules in `AGENTS.md`.

---

## 8. Open questions

| ID | Question | Impact | Decide by |
|---|---|---|---|
| OQ-01 | Domain name (`.com` preferred, `.dev` second) | Site, email, SEO | Before v1 |
| OQ-02 | Visual direction: references, palette, type, motion intensity | All design work | v1 design phase |
| OQ-03 | Editor: Markdown source with preview, or WYSIWYG | FR-ADMIN-03 | Before v1 |
| OQ-04 | Rating scale: 5 stars with halves, 10-point, or no score | FR-LIFE-04 data type | Before v2 |
| OQ-05 | Bilingual EN/ZH content | FR-HOME-09, architectural | Before v1, hard to retrofit |
| OQ-06 | Track repeat experiences (reread, replay, revisit) | Whether to split out `ItemLog` | Before v2 |
| OQ-07 | Watermark or right-click protection on photos | FR-GALLERY-09 | Before v2.5 |
| OQ-08 | Publish the CV PDF for download, given it carries contact details | FR-HOME-05 | Before v1 |
| OQ-09 | Existing content inventory: how many notes, items, and finished photos | Whether a bulk import script is needed | During v1 |
| OQ-10 | Allow fully anonymous whispers | FR-SOCIAL-06 | Before v2.5 |

---

## Change log

| Date | Version | Change |
|---|---|---|
| 2026-08-29 | v0.1 | First draft. Full-stack route, four release tiers, data model, China-accessibility constraint |
| 2026-08-29 | v0.2 | Split architecture and engineering standards into a separate file; added `adr/` and `tech-debt.md` |
| 2026-08-30 | v0.3 | Removed learning-goal sections. Project docs track product and engineering decisions only |
| 2026-08-30 | v0.4 | Condensed to concise technical English per `AGENTS.md` section 3. No requirements changed |
