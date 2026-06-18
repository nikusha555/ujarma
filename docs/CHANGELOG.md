# Changelog — Ujarma Official Village Website

> **Maintenance rule:** Append a new entry to this file whenever a meaningful change is made to the codebase. Follow the format established below. Include the date, a version tag, and a grouped list of changes.

---

## [1.8.0] — 2026-06-18

### Admin Mobile UX Enhancements

> Pure CSS / JS / presentational improvements. No routes, controllers, models, DB schema, forms, validation, authentication, session handling, or business logic were modified. Desktop appearance is unchanged.

---

#### Issues Identified Before Implementation

| # | Area | Issue |
|---|------|-------|
| 1 | Tables | Horizontal scroll on phones — content feels like a shrunken desktop table |
| 2 | Tables | Long Georgian titles truncate with `…`; no room to read |
| 3 | Tables | Action icons (view/edit/delete) are bare icon links with no visual tap affordance or proper touch size |
| 4 | Sidebar | `ease` easing instead of natural `cubic-bezier` made the drawer feel stiff |
| 5 | Sidebar | Backdrop used `display:none`→`display:block` — no fade-in/out animation |
| 6 | Sidebar | No in-drawer close button; users relied on tapping outside or Escape |
| 7 | Forms | Input `font-size: 0.9375rem` (15 px) triggers iOS Safari auto-zoom on focus |
| 8 | Forms | Checkboxes were 16 px, below comfortable touch size |
| 9 | Forms | Filter bar submit button was not full-width on mobile |
| 10 | Dashboard | Quick-action links were ~30 px tall, below 44 px touch target minimum |
| 11 | Gallery | Card action icons (edit/delete) had no padding or visual container |
| 12 | Pagination | Buttons were ~36 px on all mobile widths — too small |
| 13 | Stat cards | Icon/number didn't scale down on small phones |
| 14 | Long content | `.admin-content` lacked `overflow-wrap: break-word` |
| 15 | Modal | Action buttons didn't stretch to full width on ≤575 px |

---

#### Improvements Implemented

**Sidebar — Drawer Animation & Close Button**
- Changed backdrop from `display:none / display:block` → `opacity: 0 / 1` + `pointer-events: none / auto` with `transition: opacity 0.25s ease` — smooth fade now matches open/close
- Changed sidebar slide transition from `ease` to `cubic-bezier(0.4, 0, 0.2, 1)` — natural "Material-style" easing that feels like a real mobile drawer
- Added `<button id="adminSidebarClose">` with X icon inside the sidebar logo area, visible only on mobile/tablet via `display: none` base + `display: flex` at `≤991.98px`; `.admin-logo { position: relative }` anchors it absolutely
- Close button: `focus` state has a gold outline ring (`outline: 2px solid rgba(197,160,40,0.5)`) for keyboard accessibility
- `main.js`: added `sidebarCloseBtn` event listener that calls `closeAdminSidebar()` and returns focus to the hamburger toggle

**Tables → Card Layout (≤767.98px)**
- Added `data-label` attributes to every `<td>` in `news.ejs` (სათაური, კატეგორია, თარიღი, სტატუსი) and `attractions.ejs` (სახელი, კატეგორია, სტატუსი, გამორჩ.)
- Added `class="admin-cell-title"` to the title/name `<div>` inside the first `<td>` of both tables
- CSS converts `<table>` → block at `≤767.98px`: `thead` hidden; each `<tbody tr>` becomes a white card with `border`, `border-radius`, and `box-shadow`; each `<td>` renders as a label+value row via `td[data-label]::before { content: attr(data-label) }`
- Actions `<td>` (`data-label=""`) shows no label and is right-aligned with a `var(--gray-50)` background — visually a button bar footer
- Title `div` (`admin-cell-title`) resets to `white-space: normal; overflow: visible; max-width: none` in card view — full Georgian title is readable
- Action icon buttons in the card footer get `min-width/height: 40px`, `background: var(--gray-100)`, `border-radius: var(--radius-md)` — clear visual tap targets; delete button gets `background: #fef2f2; border: 1px solid #fecaca`
- Horizontal scroll removed at `≤767.98px` (`overflow-x: visible !important`; `min-width: 0 !important`)
- Desktop table layout (`≥768px`) is completely unchanged

**Forms — iOS Zoom Fix & Better Touch**
- Set `font-size: 1rem !important` on all admin inputs, selects, textareas, and filter controls at `≤767.98px` — prevents iOS Safari's automatic viewport zoom on focus (triggered when `font-size < 16px`)
- Inputs and selects gain `padding: 0.8125rem 0.875rem; min-height: 48px` at `≤767.98px` — comfortable thumb typing
- Checkbox rows: `min-height: 44px; padding: 0.25rem 0; gap: 0.75rem` + checkboxes `width/height: 1.125rem`
- Filter bar submit button: `width: 100%; min-height: 44px` at `≤767.98px`

**Dashboard Quick Links**
- Added `class="admin-quick-link"` to all four quick-action `<a>` tags; inline styles preserved for desktop
- On mobile (≤767.98px): `display: flex !important; width: 100% !important; min-height: 48px; justify-content: center` — full-width stacked buttons

**Gallery Card Actions**
- Added `class="admin-gallery-card-actions"` to gallery item action `<div>`
- At `≤767.98px`: edit/delete icons get `min-width/height: 40px; display: inline-flex; border-radius: var(--radius)` — tappable

**Pagination**
- At `≤991.98px`: `.admin-page-btn` gains `min-height: 40px; min-width: 36px; display: inline-flex`
- At `≤575.98px`: `min-height: 42px; min-width: 38px` + `justify-content: center` on the pagination row

**Stat Cards**
- At `≤767.98px`: padding `1.25rem`, icon `44×44px`, number `1.75rem`
- At `≤575.98px`: padding `1rem`, icon `40×40px`, number `1.5rem`

**Admin Content**
- Base style: `.admin-content { overflow-wrap: break-word; word-break: break-word }` — long Georgian words / URLs never overflow

**Flash Banners**
- `align-items: flex-start` and `border-radius: var(--radius-md)` on mobile — banners with multi-line text no longer misalign the icon

**Modals**
- At `≤575.98px`: title `1.125rem`, body `0.875rem`, action buttons get `flex: 1; min-width: 0` — both Cancel and Delete stretch to equal widths

**Sidebar Close Button (CSS Section 24)**
- Base: `.admin-sidebar-close { display: none }` — invisible on desktop even without Bootstrap
- `≤991.98px`: `display: flex; position: absolute; top/right`; styled as a semi-transparent pill with hover state
- Added `/* ── 24. Admin Mobile UX Enhancements */` CSS section with comprehensive documentation

---

#### Files Modified

| File | Change |
|------|--------|
| `public/css/style.css` | Backdrop opacity animation; sidebar cubic-bezier; Section 24 (300+ lines) |
| `public/js/main.js` | `adminSidebarClose` button event listener with focus return |
| `views/layouts/admin.ejs` | Sidebar close `<button id="adminSidebarClose">` |
| `views/admin/news.ejs` | `data-label` on all `<td>`; `admin-cell-title` on title div |
| `views/admin/attractions.ejs` | `data-label` on all `<td>`; `admin-cell-title` on name div |
| `views/admin/dashboard.ejs` | `admin-quick-link` class on quick-action links |
| `views/admin/gallery.ejs` | `admin-gallery-card-actions` class on action div |

---

## [1.7.0] — 2026-06-18

### Responsive / Mobile — Admin Panel

> All changes are CSS/JS only. No routes, controllers, models, database schema, or form field names were modified. Desktop appearance is unchanged.

#### Admin Sidebar — Slide-in Mobile Drawer
- Added `.admin-sidebar-backdrop` overlay element to `views/layouts/admin.ejs`; displayed on `z-index: 99` beneath the sidebar (`z-index: 100`)
- Added `aria-label`, `aria-expanded="false"`, and `aria-controls="adminSidebar"` to the hamburger toggle button
- Added `body.admin-sidebar-open { overflow: hidden }` to prevent background scroll while drawer is open
- Rewrote sidebar JS in `public/js/main.js`: `openAdminSidebar()` / `closeAdminSidebar()` helpers manage `.open` class, backdrop, body scroll lock, and `aria-expanded` state
- Sidebar now closes via: backdrop click, **Escape** key (returns focus to toggle), nav-link tap on mobile, and viewport resize to ≥992 px

#### Admin Navigation Touch Targets
- At `≤991.98 px`: `.admin-nav-link` gains `min-height: 44 px` (up from ~34 px) — meets WCAG 2.5.5 touch-target guideline
- At `≤991.98 px`: `.admin-logout-btn` gains `min-height: 44 px`
- At `≤991.98 px`: table icon-link `<a>` tags receive `display: inline-flex; min-height: 36 px; min-width: 36 px`
- At `≤991.98 px`: `.btn-delete-trigger` inside tables gains `padding: 0.375rem !important; min-height/width: 36 px`

#### Admin Tables — Horizontal Scroll
- Moved `overflow-x: auto` from `≤575.98 px` up to `≤991.98 px` so every table scrolls horizontally on all phone and small-tablet widths
- Added `min-width: 520 px` to `.admin-table` so columns never collapse to unreadable widths

#### Admin Page Header
- At `≤991.98 px`: added `flex-wrap: wrap; gap: 0.75 rem` — title and action button wrap gracefully
- At `≤767.98 px`: stacks to `flex-direction: column; align-items: flex-start` — action button sits below title, full label always visible
- At `≤767.98 px`: `.admin-page-title` font-size reduced to `1.375 rem`
- At `≤575.98 px`: `.admin-page-title` reduced to `1.25 rem`

#### Admin Topbar
- At `≤575.98 px`: `.admin-topbar-title` gains `overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 55vw` to prevent collision with user area
- At `≤575.98 px`: `.admin-topbar-user` hidden (`display: none`) — saves space on 320–414 px screens

#### Admin Filters Bar
- At `≤767.98 px` (already existed): `flex-direction: column; align-items: stretch` — all filter controls stack vertically
- Added explicit `width: 100%` and removed `min-width: 200 px` on `.admin-filter-input` and `.admin-filter-select` at `≤767.98 px` so inputs never cause horizontal overflow on 320 px screens

#### Admin Flash & Error Messages
- Added `word-break: break-word` to `.admin-flash-success` and `.admin-error-list` at `≤767.98 px` — long Georgian strings no longer overflow their containers

#### Admin Image Previews
- At `≤767.98 px`: `.admin-image-preview` changed from `display: inline-block` to `display: block; max-width: 100%`; `img` gains `max-width: 100%; height: auto` — prevents image overflow in narrow sidebar columns on phones
- At `≤575.98 px`: preview image capped at `max-height: 120 px`

#### Delete Confirmation Modals
- At `≤575.98 px`: `.admin-modal` padding reduced from `2 rem` to `1.25 rem` — fits within 288 px content area on 320 px screens
- At `≤575.98 px`: `.admin-modal-actions` gains `flex-wrap: wrap; gap: 0.5 rem` — Cancel + Delete buttons stack when viewport is too narrow for side-by-side layout

#### Dashboard Stat Cards
- Bootstrap `col-lg-4 col-md-6` grid already produces single-column stacking on xs screens; confirmed no changes needed

#### Gallery Admin Grid
- `grid-template-columns: repeat(auto-fill, minmax(180 px, 1fr))` behaves correctly on all tested widths (320–991 px) — cards reduce to 1–2 per row naturally via CSS Grid auto-fill

#### Files Changed
| File | Nature |
|------|--------|
| `public/css/style.css` | Added backdrop CSS, body scroll lock, touch target rules, table scroll, page header stacking, filter/flash/modal/image-preview responsive fixes |
| `public/js/main.js` | Rewrote sidebar toggle: backdrop, scroll lock, Escape key, aria-expanded, resize listener |
| `views/layouts/admin.ejs` | Added `.admin-sidebar-backdrop` div; added `aria-label`, `aria-expanded`, `aria-controls` to hamburger button |

---

## [1.6.0] — 2026-06-11

### Added
- **Complete Attractions CRUD** (`/admin/attractions`)
  - List with pagination (15/page), keyword search, category filter, featured star badge, status badge
  - Create form: name, category (with datalist autocomplete), full description (HTML), image upload, featured/published toggles
  - Edit form: all fields pre-filled, existing image preview, remove-image checkbox, auto-regenerates slug on name change
  - Delete with confirmation modal — removes image file from `uploads/attractions/` on disk
  - `controllers/attractionsAdminController.js` — dedicated CRUD controller
  - `config/multerAttractions.js` — 5 MB, JPEG/PNG/WebP, saves to `uploads/attractions/`
  - Views: `admin/attractions.ejs`, `admin/attractions-create.ejs`, `admin/attractions-edit.ejs`
- **Complete Gallery CRUD** (`/admin/gallery`)
  - Grid-view list with pagination (20/page), search, category filter
  - Create form: image upload (required), title, category select
  - Edit form: image preview, replace/remove image, title, category
  - Delete with confirmation modal — removes file from `uploads/gallery/`
  - `controllers/galleryAdminController.js`
  - `config/multerGallery.js` — 5 MB, JPEG/PNG/WebP, saves to `uploads/gallery/`
  - Views: `admin/gallery.ejs`, `admin/gallery-create.ejs`, `admin/gallery-edit.ejs`

### Changed
- `models/Attraction.js` — full CRUD: `findAll`, `findFeatured`, `findBySlug`, `findRelated`, `getCategories`, `adminFindAll`, `findById`, `slugExists`, `create`, `update`, `delete`; fixed `LIMIT ?` → `LIMIT ${n}` (binary protocol fix)
- `models/GalleryItem.js` — full CRUD using `gallery_items` ⟶ `gallery_categories` JOIN; `getCategories` now returns `{id, name, slug}` objects; `findAll` uses slug filter; fixed `LIMIT ?`
- `controllers/attractionsController.js` — added `attrImgUrl` helper (resolves `uploads/attractions/`), category filter, `related` attractions for detail page
- `controllers/galleryController.js` — added `galleryImgUrl` helper (resolves `uploads/gallery/`), passes categories as `{id,name,slug}` objects
- `controllers/adminController.js` — removed stub `getAdminAttractions` / `getAdminGallery`; dashboard uses new model API
- `routes/admin.js` — full CRUD routes for attractions (6) and gallery (6); unified `makeUploadHandler` factory for all three Multer instances
- `views/pages/attractions.ejs` — category filter bar, uses `attrImgUrl()`
- `views/pages/attraction-detail.ejs` — uses `imageUrl` from controller, related attractions sidebar
- `views/pages/gallery.ejs` — category filter uses slug, uses `galleryImgUrl()`
- `docs/ROUTES.md` — expanded attractions and gallery admin sections

### Fixed
- All "Foundation Phase" placeholder notices removed from admin views
- All `დამატება` buttons now link to live create routes
- Image 404s on public attractions/gallery pages (wrong `uploads/` subdirectory)

---

## [1.5.0] — 2026-06-10

### Fixed
- **Image 404 on all news pages** — root cause: Multer saves files to `uploads/news/<filename>` but all public templates used `/uploads/<filename>` (missing the `news/` sub-path). Express's static middleware at `/uploads` resolves relative to the `uploads/` folder, so the correct URL is `/uploads/news/<filename>`. Fixed by:
  - Adding a `newsImageUrl(filename)` helper function in `newsController.js` and `homeController.js` that prepends `/uploads/news/`
  - Updating `views/pages/news.ejs` and `views/pages/home.ejs` news preview sections to use this helper
  - Rewriting `views/pages/news-article.ejs` to use `imageUrl` passed from the controller

### Added
- **Professional article detail layout** (`views/pages/news-article.ejs`)
  - Two-column layout: main content (col-lg-8) + sticky sidebar (col-lg-4)
  - Banner with category pill, headline, date meta row, featured badge
  - Featured image using correct `/uploads/news/` path, `max-height: 520px`, responsive
  - Lead paragraph block (from `summary`/`excerpt`) with gold left-border accent
  - Share button row at the bottom (Facebook)
  - Sidebar: Related articles (3 latest excluding current) with thumbnail + date
  - Sidebar: Article meta card (category, publish date, status)
- **Article typography system** (`public/css/style.css` — Section 21)
  - `.article-body` container: `overflow-wrap: break-word`, `word-break: break-word`, `hyphens: auto`
  - Styled child elements: `h2`–`h4`, `p`, `ul`/`ol`, `blockquote` (gold left border + pale background), `a`, `img`, `table`, `pre`/`code`, `hr`
  - `.article-featured-img`, `.article-category-pill`, `.article-sidebar-heading`
  - `.related-article-item`, `.related-article-thumb`, `.related-article-title`, `.related-article-date`
  - Mobile overrides at `≤767px` (smaller font, shorter max-height image, reduced blockquote padding)
- **Related articles in sidebar** — `newsController.js` now calls `News.findLatest(4)` and filters out the current article, passing up to 3 as `relatedArticles`
- **Summary field support** — listing pages (`news.ejs`, `home.ejs`) now use `article.summary || article.excerpt` for card descriptions

### Changed
- `controllers/newsController.js` — added `newsImageUrl()` helper, `relatedArticles` fetch, correct `ogImage` path, passes `imageUrl` and `newsImageUrl` to template
- `controllers/homeController.js` — added `newsImageUrl()` helper, passes it to `pages/home` render
- `views/pages/news.ejs` — uses `newsImageUrl()` helper, date locale changed to `ka-GE`, uses `summary || excerpt`
- `views/pages/home.ejs` news section — uses `newsImageUrl()` helper, uses `summary || excerpt`

---

## [1.4.0] — 2026-06-09

### Added
- **Complete News CRUD Module** (`/admin/news`)
  - **List** (`GET /admin/news`) — paginated (15/page), keyword search, category filter, status badges, Georgian labels
  - **Create** (`GET/POST /admin/news/create`) — full Georgian form: title, category, summary, HTML content, featured image upload, featured/published toggles, publication date
  - **Edit** (`GET/POST /admin/news/:id/edit`) — pre-populated form with existing image preview, remove-image checkbox, auto-updates slug only when title changes
  - **Delete** (`POST /admin/news/:id/delete`) — confirmation modal, removes image file from disk
- `controllers/newsAdminController.js` — dedicated CRUD controller (100% Georgian UI text)
- `utils/slugify.js` — Georgian Mkhedruli → Latin transliteration + URL slug normaliser; all 33 letters mapped to national romanisation
- `config/multerNews.js` — separate Multer instance saving to `uploads/news/`; 5 MB limit; JPEG/PNG/WebP only; creates directory on load
- `config/bootstrap.js → ensureMigrations()` — idempotent column-level migrations: adds `summary`, `featured_image`, `is_featured` to the `news` table on each startup if missing
- `public/css/style.css` — new **Section 20: Admin CRUD Forms** with: form card, field groups, labels, inputs, checkboxes, image preview, error list, flash success banner, pagination controls, search/filter bar, delete confirmation modal

### Changed
- `models/News.js` — rewritten with full CRUD API: `findAll`, `findLatest`, `findBySlug`, `count`, `adminFindAll`, `findById`, `slugExists`, `create`, `update`, `delete`
- `routes/admin.js` — added 5 new news routes; Multer error-wrapper middleware inlines upload errors instead of crashing; removed `getAdminNews` import
- `docs/ROUTES.md` — expanded admin news section with all 6 routes (list, create GET/POST, edit GET/POST, delete)
- `docs/DATABASE.md` — updated `news` table with 3 new columns: `summary`, `featured_image`, `is_featured`; migration notes added
- `views/admin/news.ejs` — fully rewritten: paginated table, search/filter bar, action buttons (view/edit/delete), flash messages, delete modal
- Admin sidebar "news" active state now correctly highlights for all `/admin/news/*` sub-routes

### Fixed
- `uploads/news/` sub-directory is created automatically by `multerNews.js` on first load — no manual folder creation needed

---

## [1.3.0] — 2026-06-09

### Added
- Project documentation system (`docs/` folder)
  - `docs/ROUTES.md` — complete route map with method, URL, controller, view, auth
  - `docs/DATABASE.md` — full schema reference for all 8 tables with columns, indexes, and foreign keys
  - `docs/PROJECT_STRUCTURE.md` — folder-by-folder architecture guide with ASCII diagram
  - `docs/CHANGELOG.md` — this file

### Changed
- N/A

### Fixed
- N/A

---

## [1.2.0] — 2026-06-09

### Added
- Full Georgian localisation across the entire public website and admin panel
  - All navigation labels, section headings, body copy, buttons, form labels, placeholders, empty states, error messages, and breadcrumbs translated to natural Georgian
  - Georgian page titles and meta descriptions in all six public controllers
  - `siteName` → `'უჯარმა'` and `siteTagline` → Georgian in `app.js` global locals

### Changed
- Typography upgraded for Georgian script support
  - Added **Noto Serif Georgian** and **Noto Sans Georgian** to `head.ejs` and `style.css` font imports
  - Georgian fonts placed first in `--font-serif` and `--font-sans` CSS custom property stacks
  - Base `line-height` increased to `1.75` (Georgian Mkhedruli requires more vertical space per em)
- Dates in `views/pages/news-article.ejs` use `locale 'ka-GE'` for native Georgian date formatting

### Fixed
- Mobile responsive layout overhaul (`public/css/style.css`)
  - Navbar mobile collapse panel — added `border-top`, full-width links, 48px touch targets
  - `navbar-toggler` enforced `min-width/height: 44px` (WCAG touch target standard)
  - Hero title uses `clamp()` scaling with `word-break: break-word` to prevent overflow at 320px
  - Hero CTA buttons stack vertically at ≤767px with `max-width: 280px` centred column
  - Hero `padding` replaced with `clamp()` for smooth scaling at all viewport sizes
  - Admin table wrapped in `overflow-x: auto` on `<576px` to prevent horizontal scroll
  - Page banner title scaled down appropriately on smallest breakpoints

---

## [1.1.0] — 2026-06-09

### Fixed
- Bootstrap startup error: `This command is not supported in the prepared statement protocol yet`
  - Root cause: `conn.execute()` sends queries over the binary prepared-statement protocol; MySQL rejects DDL commands (`CREATE DATABASE`, `CREATE TABLE`, `USE`) in this protocol
  - Fix: replaced all DDL-executing calls with `conn.query()` in `config/bootstrap.js`
  - DML calls with `?` placeholders (`INSERT`, `SELECT`) correctly remain as `conn.execute()`
  - Affected methods: `ensureDatabase()` (CREATE DATABASE), `ensureTables()` loop (CREATE TABLE), bootstrap main function (USE statement)

---

## [1.0.1] — 2026-06-09

### Added
- Automatic database bootstrap system (`config/bootstrap.js`)
  - Connects to MySQL server without selecting a database
  - Creates the target database automatically if it does not exist (checks `information_schema.SCHEMATA`)
  - Creates all 8 tables with `CREATE TABLE IF NOT EXISTS` (idempotent)
  - Inserts seed data into empty tables: default admin account (bcrypt cost-12), 4 news categories, welcome news article, Ujarma Fortress attraction, 4 gallery categories, 1 placeholder gallery item
  - Fully idempotent — safe to run on every startup; skips any already-populated table
  - Hard-fails with `process.exit(1)` if MySQL is unreachable, preventing Express from starting with a broken database state
- `bcryptjs` dependency for secure password hashing
- `config/bootstrap.js` called from `app.js` before `app.listen()`

### Changed
- `app.js` startup flow: `app.listen()` moved inside `async start()` function; server only binds after bootstrap completes successfully
- Removed `testConnection()` from `config/db.js` (replaced by bootstrap logging)

---

## [1.0.0] — 2026-06-09

### Added
- Initial production-ready project foundation
- Project structure: MVC architecture with `config/`, `controllers/`, `models/`, `routes/`, `middleware/`, `uploads/`, `public/`, `views/`
- **Express application** (`app.js`)
  - Helmet security headers with Content Security Policy
  - gzip compression
  - JSON + URL-encoded body parsing (10 KB limit)
  - express-session with secure cookie configuration
  - EJS view engine with express-ejs-layouts
  - Global `res.locals` for `currentPath`, `siteName`, `currentYear`, `siteUrl`, `isAdmin`
  - 404 and 500 error handlers
- **Database** (`config/db.js`)
  - mysql2/promise connection pool (10 connections)
  - Configured from `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` env vars
  - `utf8mb4` charset, UTC timezone
- **Database schema** (`config/schema.sql`)
  - Reference SQL for all tables: `admins`, `categories`, `news`, `attractions`, `attraction_images`, `gallery_categories`, `gallery_items`, `contact_messages`
- **File upload configuration** (`config/multer.js`)
  - Disk storage to `uploads/`
  - 5 MB file size limit
  - Allowed types: JPEG, PNG, WebP
  - Secure timestamped random filenames
- **Models**
  - `models/News.js` — `findAll`, `findLatest`, `findBySlug`, `count`
  - `models/Attraction.js` — `findAll`, `findFeatured`, `findBySlug`
  - `models/GalleryItem.js` — `findAll`, `findRecent`, `getCategories`
- **Controllers**
  - `homeController.js` — parallel data fetching for homepage sections
  - `newsController.js` — listing and single-article views
  - `attractionsController.js` — listing and detail views
  - `galleryController.js` — gallery with category filter
  - `aboutController.js` — static about page
  - `contactController.js` — form display + server-side validation + Post-Redirect-Get
  - `adminController.js` — login, logout, dashboard, news/attractions/gallery management views
- **Routes**
  - `routes/index.js` — all 10 public routes
  - `routes/admin.js` — 8 admin routes, protected by `requireAdmin` middleware
- **Middleware**
  - `middleware/authMiddleware.js` — `requireAdmin` session guard with `returnTo` redirect
  - `middleware/errorMiddleware.js` — `notFoundHandler` + global `errorHandler`
- **Design System** (`public/css/style.css`)
  - CSS custom properties: Deep Navy + Gold + neutral palette
  - Typography: Playfair Display (headings) + Inter (body)
  - Components: navbar, hero, section cards, attraction cards, gallery grid, contact CTA, page banner, footer, admin sidebar, admin tables, buttons, forms
  - Mobile-first responsive breakpoints: 1200, 992, 768, 576px
- **Client-side JS** (`public/js/main.js`)
  - Navbar scroll shadow
  - Active link detection
  - Hero scroll indicator
  - Gallery lightbox (vanilla JS, no dependencies)
  - Admin sidebar mobile toggle
  - Alert dismiss
- **Views**
  - `views/layouts/main.ejs`, `views/layouts/admin.ejs`
  - Partials: `head.ejs` (full SEO + OG + Twitter Card), `navbar.ejs`, `footer.ejs`
  - Public pages: home, news, news-article, attractions, attraction-detail, gallery, about, contact, error
  - Admin pages: login (standalone), dashboard, news, attractions, gallery
- **Environment**
  - `.env.example` with all required variables documented
  - `.gitignore` excluding `node_modules/`, `.env`, `uploads/*`, logs

---

## How to Add a Changelog Entry

When making changes, prepend a new entry at the top (below this heading, above the previous version):

```markdown
## [X.Y.Z] — YYYY-MM-DD

### Added
- Brief description of new feature or file.

### Changed
- Brief description of modified behaviour.

### Fixed
- Brief description of bug fix.

### Removed
- Brief description of removed feature or file.
```

Version numbering follows [Semantic Versioning](https://semver.org/):
- **MAJOR** (`X`): breaking change or full redesign
- **MINOR** (`Y`): new feature, backward compatible
- **PATCH** (`Z`): bug fix or small non-breaking change
