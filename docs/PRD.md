# Personal Site — Product Requirements

> v0.54 · 2026-11-25 · Draft
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
- Publishing from a phone takes under 5 minutes. Verified from v1.5; v1 verifies publishing on a desktop browser.
- The site is still updated six months after launch.

### 1.3 Design principles

1. **Two personas.** Formal outer layer, personal inner layer, visually distinct.
2. **Mobile-first.** The admin is designed to write on. v1 accepts the admin on a desktop browser; phone optimisation is accepted in v1.5. Admin layouts stay fluid from v1: no fixed widths and no hover-only actions.
3. **Content first.** No effect delays first paint or disrupts reading.
4. **Low maintenance cost.** Fewer features over heavier process.
5. **Reachable from mainland China.** See 6.1.
6. **Seams only at identified change points.** See `architecture.md` section 1.

---

## 2. Scope

Releases ship in the order below and carry no calendar dates. Milestones and exit conditions: `ROADMAP.md`.

### 2.1 v1

Homepage · blog (list, detail, tags) · admin (write, upload, publish) accepted on desktop browsers · `fangmingluan.com` · deployment · owner login (email code, 30-day session) · hidden entrance · one approved visual direction applied to the public pages · Moments feed and composer (FR-MOMENT-01, 02, 08; FR-ADMIN-11), and post categories, view counts, anonymous post likes, and post language versions (FR-BLOG-18 to 22), added at the owner's request.

Excluded: life list, gallery, the rest of Moments (light Markdown, place and mood, infinite scroll), visitor login, comments, ratings, whispers, subscriptions, dark mode, i18n of the interface and locale-prefixed routes (FR-BLOG-22 marks content languages only).

### 2.2 v1.5

Owner publishing only. Phone-optimised admin · Moments: light Markdown, place and mood, infinite scroll · RSS · math · offline tolerance · installable PWA · homepage content editable in admin.

### 2.3 v2

Owner publishing only. Life list (films, books, games, places) with owner ratings and reviews · cover and metadata fetch.

### 2.4 v2.5

Gallery · travel map · dark mode · visitor registration and login (email code, GitHub, Google; reuses the v1 owner authentication system) · polymorphic comments · visitor ratings and short reviews · anti-spam and moderation · self-service account deletion · whisper inbox · update subscriptions.

### 2.5 Out of scope, all versions

- Multi-user publishing. Owner only.
- Two-way messaging. Whispers run visitor to owner.
- ICP filing and mainland hosting. Slower mainland access is accepted.
- Visibility tiers. The `visibility` column is reserved so adding them needs no restructuring. Media for any non-public content follows ADR-0022: the permission check runs before any cache.
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
| `/admin/moments` | Moment management | v1 | Composer, list, edit, delete |
| `/moments` | Moments | v1 | Reverse-chronological feed |
| `/life` | Life list overview | v2 | Categories and stats |
| `/life/movies` `/life/books` `/life/games` `/life/places` | Category lists | v2 | Cover-led card grid |
| `/life/[type]/[id]` | Item detail | v2 | Owner review and rating. Visitor ratings and comments arrive in v2.5 |
| `/gallery` | Gallery | v2.5 | |
| `/gallery/[category]` | Category gallery | v2.5 | landscape / portrait / documentary |
| `/gallery/[id]` | Single photo | v2.5 | Large view, EXIF, story |
| `/whisper` | Whisper form | v2.5 | |
| `/login` | Login | v1 | Owner only until v2.5, which opens it to visitors |
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

The v1 homepage uses this fixed order.

**Placeholder rule, v0.21.** The build phase prioritises the site over its copy. Undecided content renders one visibly labelled `Placeholder` block. It never renders invented, sample, or lorem-ipsum copy. A placeholder must be identifiable at a glance and by searching for `Placeholder`. This rule replaces the earlier rule that empty sections stay unpublished.

Homepage sections use the `placeholders` list in `src/features/home/content.ts`. The current list is `Profile`, `Experience`, `Selected Projects`, and `Skills`. Removing an entry hides that section. `Writing` is data-driven and stays hidden until posts exist.

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

Formal-host typography uses the device system font stack and loads no webfont. Tokens live in `src/styles/formal.css`. A later webfont must be self-hosted and subsetted under NFR-CN-01.

### 4.2 Blog (FR-BLOG)

| ID | Requirement | Version | Acceptance |
|---|---|---|---|
| FR-BLOG-01 | Post list, reverse-chronological, paginated | v1 | 10 per page; title, summary, date, tags, reading time. Visitors switch between the full view (FR-BLOG-15) and the compact view (FR-BLOG-16) with two icon buttons beside the page title, each with a tooltip and an accessible name; the choice persists per browser and defaults to full. The page never renders one view and then swaps to the other. Tag archives use the same views |
| FR-BLOG-02 | Post detail | v1 | CJK typography at line-height 1.75+, 17–18px |
| FR-BLOG-03 | Code highlighting | v1 | Python, TS, Java, C, C++, Go; language label, copy button. C++ uses the C grammar (ADR-0028) |
| FR-BLOG-04 | Tags and tag archive | v1 | Many tags per post, at most 10. The owner enters comma-separated tag names in the post form; an unknown name creates the tag. Archives list published posts only |
| FR-BLOG-05 | Table of contents | v1 | Sidebar with scroll spy; collapsed on mobile |
| FR-BLOG-06 | Draft and published states | v1 | Drafts hidden from lists, reachable by preview link |
| FR-BLOG-07 | Images | v1 | Lazy-loaded, explicit dimensions, click to enlarge |
| FR-BLOG-08 | Math | v1.5 | KaTeX |
| FR-BLOG-09 | Full-text search | v2 | Client-side; revisit past 100 posts |
| FR-BLOG-10 | Post series | v2 | Previous and next within a series |
| FR-BLOG-11 | Comments | v2.5 | See 4.6 |
| FR-BLOG-12 | RSS | v1.5 | |
| FR-BLOG-13 | Structured article content | v1 | Store only versioned TipTap JSON; validate it against `article-content-schema.md`; treat HTML and Markdown as derived exports |
| FR-BLOG-14 | Post cover | v1 | One optional library image per post, set in FR-ADMIN-28. Rendered with explicit dimensions and the `Media` alt text. Used by the list views only; the post page is unchanged. A deleted image leaves the post without a cover |
| FR-BLOG-15 | Full list view | v1 | Posts in date order in a uniform card grid: two columns from the 40rem breakpoint, one below. Every card has the same structure inside a bordered container: a 16:9 cover, category, date (FR-BLOG-21) and reading time, title, a summary clipped to two lines, tags, view and like counts, and the language marker (FR-BLOG-22). A post without a cover shows a placeholder of the same size with its title in the serif face. The card is one link; tags remain separate links. On the blog index, pinned posts (FR-BLOG-17) appear above the grid on page 1 and are left out of the grid |
| FR-BLOG-16 | Compact list view | v1 | Grouped by publication year, newest first, with the year shown once. Each row shows the `MM-DD` date close beside the title. One vertical line joins every row's dot within a year. Tags and reading time are hidden. Hover or keyboard focus highlights the row and reveals the summary under the title. On touch, the first tap reveals the summary and the second opens the post |
| FR-BLOG-17 | Pinned posts | v1 | The owner pins up to 3 posts (FR-ADMIN-29); the most recently pinned comes first. Page 1 of the blog index full view shows published pinned posts above the grid as wide cards: cover beside the text, larger title, full summary, tags, and a pin mark. The grid and its pagination leave them out. The compact view and tag archives list them in date order. A pinned draft keeps its pin and is hidden from visitors |
| FR-BLOG-18 | Post category | v1 | Each post has one category from the owner's category list (FR-ADMIN-30). The list stays small by design; topics come from tags. Set in the publish dialog (FR-ADMIN-07); publishing and updating a published post require it. Cards and the post page show its name. No category archive yet |
| FR-BLOG-19 | View count | v1 | Each opening of a published post page adds one view, recorded from the browser after load. No cookie, IP, or other personal data is stored. Cards and the post page show the count |
| FR-BLOG-20 | Anonymous likes | v1 | Any visitor likes or unlikes a published post from the post page, once per browser. The browser is identified by a random `visitor_id` cookie set on the first like only. Likes are limited to 30 per minute per IP. Cards and the post page show the count. See ADR-0037 |
| FR-BLOG-21 | Publication date display | v1 | Cards and the post page show the publication date only, never the update date. Within 7 days of publication it is relative: `28 minutes ago`, `12 hours ago`, `3 days ago`; after that `25 Nov 2026`. The browser refreshes a relative date after load. The compact view keeps `MM-DD` (FR-BLOG-16) |
| FR-BLOG-22 | Post language versions | v1 | Each post has one content language: `zh-Hans`, `zh-Hant`, `en`, or `ja`. A post may be a translation of another post; the original and its translations form one group with at most one post per language. The marker lists the languages of the group's published versions with each language's own short label (`简`, `繁`, `EN`, `日`), never a name translated into the interface language. A post written in one language shows that language only. The list views show one card per group, the original while it is published; the post page links to the other published versions. Language and translation are set in the publish dialog (FR-ADMIN-07); publishing requires a language. See ADR-0038 |

### 4.3 Moments (FR-MOMENT)

| ID | Requirement | Version | Acceptance |
|---|---|---|---|
| FR-MOMENT-01 | Reverse-chronological feed | v1 | `/moments` lists moments newest first, 20 per page with an Older link until FR-MOMENT-06. Each entry shows its body, images, and creation date; no titles. The body is plain text up to 2,000 characters with line breaks kept. A moment has a body, images, or both |
| FR-MOMENT-02 | 0–9 images per entry | v1 | One image shows at its own aspect ratio; four show as a 2×2 grid; any other count shows as a three-column grid of square crops. Tapping an image opens an enlarged view with previous and next. A deleted image is left out |
| FR-MOMENT-03 | Light Markdown | v1.5 | Bold, link, line break only |
| FR-MOMENT-04 | Optional place and mood | v1.5 | Plain-text place label. When an attached image has GPS coordinates, suggest a place name; the owner edits it, for example to "Mount Vesuvius", before publishing. Only the label is public, never coordinates. The reverse-geocoding service needs an ADR |
| FR-MOMENT-05 | Fast publishing from a phone | v1.5 | 5 interactions or fewer |
| FR-MOMENT-06 | Infinite scroll | v1.5 | |
| FR-MOMENT-07 | Comments | v2.5 | |
| FR-MOMENT-08 | Reserved like and comment slots | v1 | Each entry shows disabled like and comment controls in a fixed footer slot. FR-SOCIAL-01 and a future reaction table fill them; the moment itself stores no counts. See ADR-0036 |

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
| FR-LIFE-11 | Visitor ratings and short reviews | v2.5 | See 4.6 |

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
| FR-AUTH-01 | Email login, 6-digit code | v1 | Primary method, see 6.1. v1 serves pre-provisioned owner addresses only; unknown addresses receive the same response. Opened to visitors in v2.5; see ADR-0017 |
| FR-AUTH-02 | GitHub login | v2.5 | Secondary method; verify mainland reachability before release |
| FR-AUTH-03 | Google login | v2.5 | Secondary, labelled as needing network access |
| FR-AUTH-04 | Owner account | v1 | `role = OWNER`, sole admin access |
| FR-AUTH-05 | Session persistence and logout | v1 | 30-day database-backed session; required by FR-ADMIN-01 |
| FR-AUTH-06 | Self-service account and data deletion | v2.5 | GDPR, see 6.5 |
| FR-SOCIAL-01 | Comments on posts, moments, items, photos | v2.5 | One polymorphic implementation |
| FR-SOCIAL-02 | Threaded replies | v2.5 | One level only |
| FR-SOCIAL-03 | Owner can delete or hide any comment | v2.5 | Single admin action |
| FR-SOCIAL-04 | New-comment notification | v2.5 | Email or admin badge |
| FR-SOCIAL-05 | Visitor rating and short review on items | v2.5 | Shown separately from the owner rating |
| FR-SOCIAL-06 | Whispers: private messages to the owner | v2.5 | Anonymous allowed, with abuse protection |
| FR-SOCIAL-07 | Email notification for new posts | v2.5 | One-click unsubscribe |
| FR-SOCIAL-08 | Anonymous visitors read all public content | v1 | Login gates writing, never reading |
| FR-SOCIAL-09 | Anti-spam: rate limits, word filter, moderation switch | v2.5 | See 6.4 |

### 4.7 Admin (FR-ADMIN)

Core of v1. v1 accepts every screen on a desktop browser. Screens stay fluid down to 375px and must open and work on a phone without optimisation. Phone acceptance starts in v1.5; see Issue #50.

| ID | Requirement | Version | Acceptance |
|---|---|---|---|
| FR-ADMIN-01 | Login and authorisation | v1 | Non-owner requests to `/admin/*` return 404 |
| FR-ADMIN-02 | Post list grouped by state | v1 | Create, find, edit, and delete on a desktop browser. One-handed phone use in v1.5 |
| FR-ADMIN-03 | TipTap article editor with preview | v1 | Edit and preview on a desktop browser. Editing area and block controls remain usable above the on-screen keyboard in v1.5. Preview shows the saved version in the public article layout, with the table of contents and without the site header and footer, inside the admin. An Edit and Preview toggle sits at the same place on both views, centred in the editor header; focus mode is the rightmost header control. A published post opens in Preview; a draft or a new post opens in Edit. The edit view holds the title and body only; post settings live in the publish dialog (FR-ADMIN-07). The toolbar offers headings, bold, link, lists, quote, code block, and image; a quote renders as an accent-barred panel in both the editor and the public page |
| FR-ADMIN-04 | Draft autosave | v1 | Every 10s and on blur. Saves the title and article content of an existing draft; a blank title is not autosaved. Settings save through the publish dialog, Ctrl or Cmd+S, or save on leave. A new post autosaves once it is created; a published post changes only through Update in the publish dialog. A save never overwrites a newer version. There is no Save button |
| FR-ADMIN-05 | Image upload: library, camera, paste | v1 | Insert an `image` node that references the stored `Media` record. Library and paste in v1; camera input in v1.5 |
| FR-ADMIN-06 | Upload limits, GPS removal, delivery conversion | v1 | JPEG, PNG, WebP up to 50 MB. GPS removed from the stored file; coordinates kept owner-only. AVIF or WebP at fixed widths on delivery. HEIC and HEIF are not accepted: the owner uploads Lightroom JPEG exports, and the iOS photo picker already converts HEIF to JPEG. Reopen when HEIC files reach the desktop upload. See ADR-0021 |
| FR-ADMIN-07 | Publish, unpublish, schedule | v1 | Publish and unpublish ship in v1. Scheduling is deferred to v1.5. A header button, Publish on a draft and Update on a published post, opens a publish dialog with cover, pin, category (FR-BLOG-18), language and translation (FR-BLOG-22), tags, slug, summary, and word count. Its primary action publishes the draft or updates the live post; a draft can also save its settings without publishing. Closing the dialog keeps unsaved choices; a save error reopens it. Later fields, such as privacy and location, join this dialog. Unpublish lives in the post list row menu (FR-ADMIN-20). See ADR-0035 |
| FR-ADMIN-08 | Media library management | v1 | Browse, copy link, delete |
| FR-ADMIN-09 | Mobile rich-text toolbar | v1.5 | One-tap heading, bold, link, list, image, and code-block controls |
| FR-ADMIN-10 | Offline tolerance | v1.5 | Content persists locally, resumes after reconnect |
| FR-ADMIN-11 | Quick moment composer | v1 | `/admin/moments` holds a plain textarea and an image button; no title, no rich text, no draft. Post publishes at once. Images upload through `POST /api/media` while the owner types and can be removed before posting. The list below shows every moment with edit and delete; edit opens the same composer at `/admin/moments/[id]`. Delete asks once. Deleting an image used by a moment warns as for posts (ADR-0025). See ADR-0036 |
| FR-ADMIN-12 | Item entry with cover fetch | v2 | |
| FR-ADMIN-13 | Batch photo upload with EXIF extraction | v2.5 | |
| FR-ADMIN-14 | Comment and whisper moderation | v2.5 | |
| FR-ADMIN-15 | Installable as a PWA | v1.5 | Add to home screen |
| FR-ADMIN-16 | Admin overview desk | v1 | `/admin` shows draft and published counts, the most recently updated drafts to resume, recent posts, and New post and Media actions |
| FR-ADMIN-17 | Command palette | v1 | Ctrl or Cmd+K opens a search over admin pages, actions, and post titles; Enter navigates |
| FR-ADMIN-18 | Editor keyboard save and save on leave | v1 | Ctrl or Cmd+S saves a draft and opens the publish dialog on a published post. An in-app link or command palette entry that leaves a draft with unsaved changes, including Back and Preview, saves first and stays on the page if the save fails. A published post asks in an in-app dialog: keep editing, leave without saving, or save and leave, which updates the live post. Closing or reloading the tab uses the browser's own prompt; browser back and forward are not intercepted |
| FR-ADMIN-19 | Action feedback | v1 | Save, create, publish, unpublish, delete, and copy outcomes show a transient toast, including after a redirect |
| FR-ADMIN-20 | Post list search and live link | v1 | The post list filters by title or slug as the owner types; a published post links to its public page. Rows show title, summary, and last update; the row opens a draft in Edit and a published post in Preview; icon actions preview the post and open its public page. A row menu (⋯) holds Unpublish for a published post |
| FR-ADMIN-21 | Media grid | v1 | The library shows a thumbnail grid; opening an item shows its details, copy link, and delete |
| FR-ADMIN-22 | Styled system pages | v1 | Not-found, error, and loading states use the site tokens. A non-owner `/admin` request gets the same not-found page as any unknown URL |
| FR-ADMIN-23 | Writing comfort | v1 | New post opens a stored blank draft, so autosave starts at once (ADR-0030). The editor body uses the public article typography and shows a placeholder when empty. The title field wraps. The editor header shows save state; word count and reading time show in the publish dialog. Ctrl or Cmd+. toggles a focus mode that hides the admin navigation |
| FR-ADMIN-24 | Link text and address | v1 | The Link control, Ctrl or Cmd+K, opens a text and address pair at the cursor, written as `[text](address)`, with or without a selection. Editing a link changes both. Pasting a bare address inserts it as a link and opens the pair with the text empty. Empty text keeps the address as the text. A bare domain gains `https://`. Typing `[text](address)` converts to a link |
| FR-ADMIN-26 | Immersive editor background | v1 | A background image covers the viewport behind the edit view at one of five visibility tiers: Off, 25%, 50%, 75%, 100%. A post opens with the default from FR-ADMIN-27 unless it has its own choice. The editor control picks a library image or uploads one, sets the tier, or removes the image for this post only; it shows whether the post uses the default and resets the post to it. With a background active, the admin header, editor header row, editor card, and toolbar render as frosted glass; text keeps WCAG AA contrast at every tier. Without `backdrop-filter` support or with reduced transparency, panels render solid. Choices render on first paint and are shared across devices; they never change a post's `updatedAt`. The preview and other admin pages are unchanged. A deleted image returns the editor to the plain canvas. See ADR-0031 and ADR-0032 |
| FR-ADMIN-27 | Admin settings | v1 | `/admin/settings`, linked from the admin navigation and the command palette, holds owner defaults. Its Editor section sets the default editor background image and visibility tier used by every post without its own choice (FR-ADMIN-26). Later appearance options join this section |
| FR-ADMIN-28 | Post cover selection | v1 | The publish dialog (FR-ADMIN-07) shows the cover (FR-BLOG-14) and sets, replaces, or removes it from the library or a new upload. The cover is a post field and saves with the post. Post list rows (FR-ADMIN-20) show it as a small thumbnail when set |
| FR-ADMIN-29 | Pin posts | v1 | The publish dialog (FR-ADMIN-07) has a Pinned switch that saves with the post (FR-BLOG-17). Pinning a fourth post is refused with a field error that names the limit. Post list rows (FR-ADMIN-20) show a pin icon on pinned posts |
| FR-ADMIN-30 | Category list | v1 | The Categories section of `/admin/settings` (FR-ADMIN-27) adds, renames, and deletes post categories (FR-BLOG-18). Names are unique, ignoring case, and at most 20 characters. A category used by a non-deleted post cannot be deleted; the error names how many posts use it |

---

## 5. Data model (draft)

The following compact notation defines the logical model, not executable SQL. Issue #38 translates the v1 content subset in 5.1 into versioned SQLite migrations. Fields are cheap to add; relations are not — review those first.

1. All four life-list categories share one `Item` table, discriminated by `type`, category-specific fields in `meta`. See ADR-0002.
2. Comments are polymorphic (`targetType` + `targetId`), serving posts, moments, items, photos.
3. All images go through `Media`. Business tables store a Media id, so compression, CDN, and cleanup live in one place.

```text
// ---------- Users ----------
model User {
  id            String    @id
  email         String    @unique
  emailVerified Boolean   @default(false)
  name          String
  image         String?
  role          Role      @default(VISITOR)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  lastSeenAt    DateTime?
  accounts      Account[]      // Better Auth provider links
  sessions      Session[]
  comments      Comment[]
  itemRatings   ItemRating[]
  whispers      Whisper[]
  subscription  Subscription?
}

enum Role { OWNER VISITOR }

model Account {
  id                    String    @id
  userId                String
  accountId             String
  providerId            String
  accessToken           String?
  refreshToken          String?
  idToken               String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  password              String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([providerId, accountId])
}

model Session {
  id        String   @id
  userId    String
  token     String   @unique
  expiresAt DateTime
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Verification {
  id         String   @id
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

model RateLimit {
  id          String @id
  key         String @unique
  count       Int
  lastRequest Int
}

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
  gpsLatitude  Float?                  // owner-only; never rendered publicly (ADR-0021)
  gpsLongitude Float?                  // owner-only
  exif       Json?                     // gallery only
  createdAt  DateTime @default(now())
}

// ---------- Blog ----------
model Post {
  id          String     @id @default(cuid())
  slug        String     @unique
  title       String
  summary     String?
  content     Text                      // TipTap JSON in D1 TEXT
  contentSchemaVersion Int @default(1)
  coverId     String?
  cover       Media?     @relation(fields: [coverId], references: [id])
  pinnedAt    DateTime?
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
  body       String                       // short plain text; light Markdown in v1.5
  images     Media[]    @relation("MomentImages")   // ordered, through MomentMedia
  place      String?                      // plain text, no map API
  mood       String?
  visibility Visibility @default(PUBLIC)
  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt
  deletedAt  DateTime?
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

### 5.1 v1 content field contract

Issue #38 implements only these tables. Every other field in the logical model is deferred and added by a later migration.

| Table | Fields |
|---|---|
| `Post` | `id`, `slug`, `title`, `summary`, `content`, `contentSchemaVersion`, `coverId`, `pinnedAt`, `categoryId`, `language`, `translationOf`, `status`, `publishedAt`, `createdAt`, `updatedAt`, `deletedAt` |
| `Tag` | `id`, `slug`, `name` |
| `Category` | `id`, `name`, `createdAt` |
| `PostTag` | `postId`, `tagId` |
| `Media` | `id`, `storageKey`, `mimeType`, `width`, `height`, `sizeBytes`, `alt`, `gpsLatitude`, `gpsLongitude`, `createdAt`, `updatedAt`, `deletedAt` |
| `EditorBackground` | `userId`, `mediaId`, `opacity`, `updatedAt` |
| `PostEditorBackground` | `postId`, `mediaId`, `opacity`, `updatedAt` |
| `Moment` | `id`, `body`, `createdAt`, `updatedAt`, `deletedAt` |
| `MomentMedia` | `momentId`, `mediaId`, `position` |
| `PostView` | `postId`, `count` |
| `Reaction` | `targetType`, `targetId`, `visitorId`, `kind`, `createdAt` |

- `status` accepts `DRAFT` and `PUBLISHED` only. `SCHEDULED` and `ARCHIVED` are deferred with FR-ADMIN-07 scheduling.
- `publishedAt` is set on first publication and survives unpublishing. `slug` is immutable once `publishedAt` is set.
- `updatedAt` is the optimistic concurrency token. It increases strictly on every write; a write that carries a stale token is rejected.
- `Post` deletion is soft through `deletedAt`. A deleted post is hidden from every read and releases its slug.
- `Tag` is a lookup table: no timestamps and no soft delete. Deleting a tag removes it from every post.
- `coverId` references `Media` and is null for no cover (FR-BLOG-14). Unlike an image in the content, a deleted cover does not block publishing; the post renders without a cover.
- `pinnedAt` is set when the owner pins the post and null otherwise. It orders pinned posts, most recent first. At most 3 non-deleted posts carry it (FR-BLOG-17).
- `categoryId` references `Category` and is null for a post that has never been published with one (FR-BLOG-18). `Category` is a lookup table without soft delete; a category used by a non-deleted post cannot be deleted (FR-ADMIN-30).
- `language` is a content language code from FR-BLOG-22, or null for a post that has never been published with one. `translationOf` references the original `Post` and is null for an original. An original is never itself a translation, and a group holds at most one non-deleted post per language. See ADR-0038.
- Deferred `Post` fields: `visibility`, `readingMin`, `seriesId`. Reading time is derived at render. The view count lives in `PostView`, not on `Post` (ADR-0037).
- `PostView` holds one row per viewed post, created by the first view. Writes never change `Post.updatedAt`.
- `Reaction` holds one row per like: `targetType` is `POST` and `kind` is `LIKE` in v1; `visitorId` is the anonymous `visitor_id` cookie value. Like counts are derived. It has no foreign key, so moments can reuse it (FR-MOMENT-08).
- `Media.width` and `height` are the displayed dimensions after EXIF orientation. `alt` is empty for a decorative image. Coordinates are owner-only. Deletion is soft through `deletedAt`; a deleted image no longer resolves and blocks publishing a post that references it.
- Deferred `Media` fields: `blurhash`, `exif`. `url` is derived from `storageKey`, not stored.
- `EditorBackground` holds one row per owner (FR-ADMIN-26). `mediaId` is null for no background; `opacity` is `0`, `25`, `50`, `75`, or `100`. A deleted `Media` row stays referenced and no longer resolves.
- `Moment` has no status: saving publishes. `body` is plain text, empty only when the moment has images. `createdAt` is the displayed date. `updatedAt` is the concurrency token, as for `Post`. Deletion is soft through `deletedAt`. Deferred `Moment` fields: `place`, `mood`, `visibility`.
- `MomentMedia` orders a moment's images by `position`, `0` to `8`. Each image appears at most once per moment. A deleted `Media` row stays referenced and is left out of the feed.
- `EditorBackground` is the owner default. `PostEditorBackground` holds a post's own choice and overrides the default; deleting the row returns the post to the default. It lives outside `Post`, so it never changes `Post.updatedAt`.

Open question: repeat experiences collapse into one record with a single `finishedAt`. Multiple occurrences need a separate `ItemLog` table. See OQ-06.

---

## 6. Non-functional requirements

### 6.1 Mainland China accessibility

NFR-CN-01 to NFR-CN-06, NFR-CN-08, and NFR-CN-09 are preventive and blocking. NFR-CN-07 and NFR-CN-10 are recorded, not required to pass; see ADR-0020.

| ID | Rule | Reason |
|---|---|---|
| NFR-CN-01 | No Google Fonts, `fonts.googleapis.com`, `fonts.gstatic.com` | Blocked; render-blocking stylesheet stalls the page. Self-host fonts and subset CJK |
| NFR-CN-02 | No Google Analytics, reCAPTCHA, Tag Manager | Blocked; slows every page |
| NFR-CN-03 | Google login is never the only or default method | Mainland visitors hang. Secondary placement, with a warning |
| NFR-CN-04 | Primary login is a 6-digit email code, not a magic link | Chinese mail providers rewrite external links. Configure SPF, DKIM, DMARC; prompt users to check spam |
| NFR-CN-05 | Custom domain required; never expose provider domains such as `*.vercel.app` or `*.workers.dev` | Provider domains may be unreliable in mainland China |
| NFR-CN-06 | Image CDN uses a custom domain, not `*.r2.dev` | Same |
| NFR-CN-07 | Record mainland reachability of every third-party script before launch; a known block rejects it | Comments, analytics, maps, fonts, emoji: any one breaks the page |
| NFR-CN-08 | First paint never depends on third-party resources | The body renders even if a third party is down |
| NFR-CN-09 | No ICP filing; 2–5s first paint accepted | Filing needs a domestic entity, and personal filings forbid interactive features |
| NFR-CN-10 | A mainland load-and-browse test is recorded before launch when a tester is available. Register, log in, and comment join the test in v2.5 | The only reliable verification |

Cloudflare Workers is the selected production platform under ADR-0009. The Workers preview and code rollback procedure passed Issue #29 rehearsal, and Issue #29 is closed. Vercel was disconnected in Issue #91. Provider domains are development evidence only; production requires custom domains; mainland China tests are recorded under ADR-0020.

### 6.2 Performance

- LCP under 1.5s in the UK, under 5s in mainland China.
- Lighthouse performance 90+ desktop, 80+ mobile.
- Images: multiple sizes, lazy-loaded, explicit dimensions. Never serve originals.
- First-load JS under 200KB gzipped.

### 6.3 Responsive and compatibility

- Breakpoints 375 / 768 / 1024 / 1440. Public pages are verified at every breakpoint in v1. The admin is verified at 1024 and 1440 in v1, and at 375 and 768 from v1.5.
- Two most recent major versions of Chrome, Safari, Edge, Firefox, including iOS Safari.
- Minimum touch target 44×44px on public pages in v1, and in the admin from v1.5.

### 6.4 Security and anti-spam

- Admin routes are authorised server-side, never by hiding UI.
- Escape or sanitise all user-submitted content before rendering.
- Rate-limit comments, whispers, and login-code sends (3 per minute per IP).
- Validate real file type and size on upload; remove GPS from the stored file and verify the removal on the server (ADR-0021).
- CSRF protection on sensitive operations.
- Secrets live in environment variables, never in the repository.

### 6.5 Privacy and compliance (GDPR applies)

- `/privacy` states what is collected, why, for how long, and how to delete it.
- Users can delete their account and all data themselves.
- Analytics MUST be cookie-free, so no consent banner is required. View counts (FR-BLOG-19) store no visitor data.
- The `visitor_id` cookie (FR-BLOG-20) is a random identifier set only when a visitor likes a post, kept for one year, and used only to remember that visitor's likes. It is strictly necessary for the feature the visitor uses, so it needs no consent banner. `/privacy` must list it when that page ships.
- Identifiable people in photographs require usage permission.

### 6.6 Budget

Target £15–70 per year. Server-side code highlighting exceeds the 10 ms per-request CPU limit on Workers Free, so the owner approved Workers Paid for production; see ADR-0011. Production stays on Workers Free after the public blog ships; an exceeded-CPU outcome or public promotion triggers the upgrade or cached public HTML; see ADR-0019. Development and preview stay on the free plan.

| Item | Choice | Cost |
|---|---|---|
| Domain | Cloudflare Registrar / Namecheap | £10–15 / year |
| Hosting | Cloudflare Workers Free; Workers Paid when ADR-0019's trigger fires | $5 / month once on Paid; development and preview stay free |
| Database | Cloudflare D1 Free | Free; 500MB per database and 5GB per account |
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
| Components | shadcn/ui and Radix | Current compatible | Confirmed | Admin UI and public interactive controls; public content layout stays custom CSS. See ADR-0034 |
| Database | Cloudflare D1 | Current managed service | Confirmed | Relational source of truth through a Workers binding; see ADR-0009 |
| Data access | Handwritten SQL through the D1 binding | D1 Workers API | Confirmed | Use versioned SQLite migrations and typed prepared statements; see ADR-0012 |
| Authentication | Better Auth with email OTP | Current compatible | Confirmed | Six-digit email codes and database sessions; see ADR-0004 |
| Object storage | Cloudflare R2 on a custom domain | Current managed service | Confirmed | Store all uploaded media behind the project domain |
| Image pipeline | Cloudflare Images on delivery; GPS removal in the Worker at upload | Images Free | Confirmed | ADR-0021; `cf.image` from an Access-protected source domain per ADR-0022 |
| Content | Versioned TipTap JSON in D1 TEXT | Schema v1 | Confirmed | JSON is authoritative; HTML and Markdown are derived exports; see ADR-0010 |
| Editor | TipTap | 3.x candidate | Confirmed | Use the schema in `article-content-schema.md`; validate the exact package release during implementation |
| Email | Resend | Current managed service | Confirmed | v1 requires verified code delivery to the owner mailbox. The release that opens login to visitors requires successful code delivery to QQ Mail and 163 Mail; see ADR-0016 |
| Hosting | Cloudflare Workers | Current managed service | Confirmed | Use Workers for production and Worker Previews for branches; see ADR-0009 and ADR-0015 |
| Next.js runtime adapter | vinext; OpenNext fallback | Current compatible | Confirmed | vinext passed Issue #29 compatibility, preview, and rollback checks; use OpenNext only for a documented blocker |
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
| OQ-02 | Partially resolved: formal pages are restrained; personal pages may use an opening sequence, expressive colour, and richer motion. Exact references, palette, type, and motion remain open for the personal space; formal-host type is fixed in section 4.1 | All design work | Issue #66, before the v1 visual pass in Issue #68. The personal-space system is confirmed again before personal-space implementation |
| OQ-03 | Resolved: TipTap JSON with a mobile rich-text editor and React renderer | FR-BLOG-13, FR-ADMIN-03 | Revised 2026-09-03; ADR-0010 supersedes ADR-0005 |
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
| 2026-09-03 | v0.9 | Selected Cloudflare Workers, D1, and Drizzle while retaining adapter and image validation gates |
| 2026-09-03 | v0.10 | Confirmed vinext after the Workers preview and rollback rehearsal |
| 2026-09-03 | v0.11 | Replaced authoritative Markdown with versioned TipTap JSON stored through Drizzle and D1 |
| 2026-09-05 | v0.12 | Approved Workers Paid for production because server-side code highlighting exceeds the free CPU limit |
| 2026-09-06 | v0.13 | Reconciled the platform foundation status after Issue #29 closed |
| 2026-09-06 | v0.14 | Defined the Better Auth and durable rate-limit data required by Issue #7 |
| 2026-09-06 | v0.15 | Adopted handwritten SQLite migrations and D1 prepared statements while preserving a future Drizzle path |
| 2026-09-07 | v0.16 | Deferred content persistence to Issue #38 until the v1 field contract is confirmed |
| 2026-11-10 | v0.17 | Marked release dates as under re-planning after the missed v1 target. No requirements changed |
| 2026-11-10 | v0.18 | Removed release dates in favour of ordered milestones, recorded the v1 content field contract, and deferred Workers Paid to the public blog release |
| 2026-11-13 | v0.19 | Fixed formal-host typography to the system font stack with no webfont |
| 2026-11-13 | v0.20 | Allowed labelled homepage placeholders for owner-listed empty sections; set Education to UCL BSc Computer Science |
| 2026-11-13 | v0.21 | Made labelled placeholders the default for undecided content during the build phase, replacing the unpublish-when-empty rule |
| 2026-11-14 | v0.22 | Moved the QQ Mail and 163 Mail delivery tests from v1 to the release that opens login to visitors |
| 2026-11-14 | v0.23 | Moved visitor accounts and every visitor-written feature to v2.5; v1.5 and v2 are owner publishing only. See ADR-0017 |
| 2026-11-14 | v0.24 | Moved phone acceptance of the admin from v1 to v1.5. v1 accepts the admin on a desktop browser; uploads are still processed on the server |
| 2026-11-14 | v0.25 | Added `deletedAt` to the v1 `Post` contract and defined `Tag` as a lookup table without timestamps or soft delete |
| 2026-11-15 | v0.26 | Deferred scheduled publishing to v1.5. Scoped autosave to the content of existing drafts. Defined `publishedAt` as the first publication time that freezes the slug, and `updatedAt` as the concurrency token |
| 2026-11-15 | v0.27 | Defined owner tag entry in the post form and the per-post tag limit for FR-BLOG-04 |
| 2026-11-15 | v0.28 | Kept production on Workers Free after the public blog release; see ADR-0019 |
| 2026-11-16 | v0.29 | Added an approved visual direction and its application to the public pages to v1 scope; OQ-02 is owned by Issue #66. No functional requirement changed |
| 2026-11-17 | v0.30 | Mainland tests are recorded, not blocking (ADR-0020). Selected the v1 image pipeline: Cloudflare Images on delivery, server-side GPS removal, owner-only coordinates (ADR-0021). FR-MOMENT-04 suggests an editable place name from photo GPS |
| 2026-11-17 | v0.31 | Fixed the image transform call and protected the image source domain; recorded the cache rule for non-public media. See ADR-0022. No functional requirement changed |
| 2026-11-17 | v0.32 | Added `Media` to the v1 field contract. Uploads go through a dedicated owner endpoint (ADR-0024). No functional requirement changed |
| 2026-11-22 | v0.33 | Deferred HEIC input indefinitely under FR-ADMIN-06; Issue #65 closed as not planned |
| 2026-11-22 | v0.34 | Added C++ to FR-BLOG-03, highlighted with the C grammar; see ADR-0028 |
| 2026-11-22 | v0.35 | Added FR-ADMIN-16 to FR-ADMIN-22: overview desk, command palette, keyboard save and leave guard, toasts, post search and live link, media grid, styled system pages |
| 2026-11-22 | v0.36 | FR-ADMIN-03 preview uses the public post page; FR-ADMIN-18 confirms in an in-app dialog |
| 2026-11-23 | v0.37 | FR-ADMIN-03 preview moves to an owner-only route in the blog layout with a return-to-editor bar |
| 2026-11-23 | v0.38 | FR-ADMIN-03 preview returns to the admin; one Edit and Preview toggle in a fixed place replaces the eye button and the floating bar |
| 2026-11-23 | v0.39 | FR-ADMIN-03 preview drops the site header and footer |
| 2026-11-23 | v0.40 | FR-ADMIN-20 rows show the summary instead of the slug and share one icon action style |
| 2026-11-23 | v0.41 | Added FR-ADMIN-23 writing comfort; see ADR-0030 |
| 2026-11-23 | v0.42 | FR-ADMIN-18 saves a draft before leaving the editor instead of asking |
| 2026-11-23 | v0.43 | Added FR-ADMIN-24 link text and address |
| 2026-11-23 | v0.44 | FR-ADMIN-18 covers command palette navigation |
| 2026-11-23 | v0.45 | FR-ADMIN-03 adds the quote control and quote styling |
| 2026-11-23 | v0.46 | Added FR-ADMIN-26 immersive editor background and the `EditorBackground` table; see ADR-0031 |
| 2026-11-23 | v0.47 | FR-ADMIN-03 centres the Edit and Preview toggle; FR-ADMIN-23 moves word count and reading time to the settings sidebar and widens the focus-mode card |
| 2026-11-24 | v0.48 | FR-ADMIN-26 uses a default with a per-post override; added FR-ADMIN-27 admin settings and the `PostEditorBackground` table; see ADR-0032 |
| 2026-11-24 | v0.49 | Removed Vercel from the hosting row; Worker Previews are the only preview target |
| 2026-11-24 | v0.51 | Added FR-BLOG-14 post cover, FR-BLOG-15 full list view, FR-BLOG-16 compact list view, and FR-ADMIN-28 cover selection to v1; FR-BLOG-01 offers both views. Added FR-BLOG-17 pinned posts to v1.5. Moved `coverId` into the v1 `Post` contract |
| 2026-11-24 | v0.52 | FR-BLOG-15 replaces the card rotation with a uniform card grid. FR-BLOG-17 pinned posts moves to v1 with its treatment; added FR-ADMIN-29 pin posts and `pinnedAt` in the v1 `Post` contract. FR-BLOG-01 switches views with icon buttons. Public controls may use the component kit; see ADR-0034 |
| 2026-11-24 | v0.53 | Editor separates writing from publishing: settings move from the sidebar to a publish dialog (FR-ADMIN-07, 23, 28, 29); drafts autosave the title and the Save button goes (FR-ADMIN-04, 18); Unpublish moves to a post list row menu and published posts open in Preview (FR-ADMIN-03, 20). See ADR-0035 |
| 2026-11-25 | v0.54 | Moments feed and composer move into v1 at the owner's request: FR-MOMENT-01, FR-MOMENT-02, FR-ADMIN-11, and new FR-MOMENT-08 reserved like and comment slots. Added `Moment` and `MomentMedia` to the v1 field contract. Light Markdown, place and mood, and infinite scroll stay in v1.5. See ADR-0036 |
| 2026-11-25 | v0.55 | Added FR-BLOG-18 post category, FR-BLOG-19 view count, FR-BLOG-20 anonymous likes, FR-BLOG-21 publication date display, FR-BLOG-22 post language versions, and FR-ADMIN-30 category list to v1 at the owner's request; FR-BLOG-15 cards show them and FR-ADMIN-07 sets category, language, and translation. Added `categoryId`, `language`, and `translationOf` to `Post` and the `Category`, `PostView`, and `Reaction` tables to the v1 contract; `viewCount` leaves the deferred list. Anonymous likes move ahead of v2.5; see ADR-0037. Language versions: see ADR-0038 |
