# Changelog — Ujarma Official Village Website

> **Maintenance rule:** Append a new entry to this file whenever a meaningful change is made to the codebase. Follow the format established below. Include the date, a version tag, and a grouped list of changes.

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
