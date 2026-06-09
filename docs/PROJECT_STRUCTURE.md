# Project Structure — Ujarma Official Village Website

> **Maintenance rule:** Update this file whenever a folder is added, removed, or significantly restructured.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js ≥ 18 (ES Modules — `"type": "module"`) |
| Framework | Express.js 4 |
| View Engine | EJS + express-ejs-layouts |
| Database | MySQL 8 / MariaDB 10.5 via mysql2/promise |
| Styling | Bootstrap 5 + custom CSS design system |
| Icons | Bootstrap Icons 1.11 |
| Fonts | Noto Serif Georgian, Noto Sans Georgian, Playfair Display, Inter (Google Fonts) |
| File Uploads | Multer |
| Sessions | express-session |
| Security | Helmet, bcryptjs |
| Compression | compression |
| Environment | dotenv |

---

## Root Files

```
ujarma/
├── app.js              # Application entry point — configures Express, registers
│                       # middleware, mounts routes, starts the HTTP server.
│                       # Calls bootstrap() before app.listen().
│
├── package.json        # Project metadata and npm dependencies.
│                       # "type": "module" enables ES Module syntax throughout.
│
├── .env                # Local environment variables (NOT committed to git).
├── .env.example        # Template showing all required env vars with descriptions.
├── .gitignore          # Excludes node_modules/, uploads/*, .env, logs.
```

---

## `config/`

Database and service configuration. Imported by controllers and middleware.

```
config/
├── db.js           # Creates and exports a shared mysql2 connection pool.
│                   # Pool is configured from DB_* environment variables.
│                   # exports: pool (default), testConnection()
│
├── bootstrap.js    # Runs once at startup before Express starts listening.
│                   # Steps: create DB → create tables → seed data.
│                   # Uses conn.query() for DDL, conn.execute() for DML.
│                   # exports: bootstrap (default async function)
│
├── multer.js       # Configures Multer disk storage for image uploads.
│                   # Allowed types: JPEG, PNG, WebP. Max size: 5 MB.
│                   # Saves to uploads/ with a timestamped random filename.
│                   # exports: upload (default Multer instance)
│
└── schema.sql      # Reference SQL script — documents all CREATE TABLE
│                   # statements. Not executed at runtime (bootstrap.js handles
│                   # that). Useful for manual DB setup or reference.
```

---

## `controllers/`

Business logic layer. Each controller file corresponds to one section of the site. Controllers receive `req`/`res` from Express routes, interact with models, and call `res.render()` to produce a response.

```
controllers/
├── homeController.js           # GET /
│                               # Fetches latest news, featured attractions, recent
│                               # gallery items in parallel. Renders pages/home.ejs.
│
├── newsController.js           # GET /news, GET /news/:slug
│                               # Fetches news listing or single article by slug.
│                               # Returns 404 if article not found or unpublished.
│
├── attractionsController.js    # GET /attractions, GET /attractions/:slug
│                               # Fetches attraction listing or detail by slug.
│
├── galleryController.js        # GET /gallery[?category=]
│                               # Fetches gallery items with optional category filter.
│                               # Also fetches all distinct category names.
│
├── aboutController.js          # GET /about
│                               # Static page — no DB queries.
│
├── contactController.js        # GET /contact, POST /contact
│                               # Displays form and processes submission.
│                               # Server-side validation (name, email, message required).
│                               # Uses Post-Redirect-Get pattern to prevent resubmission.
│
└── adminController.js          # All /admin/* routes
│                               # Handles: login display, login submit, logout,
│                               # dashboard (with stats), news list, attractions list,
│                               # gallery management.
```

---

## `models/`

Data access layer. Each model file wraps SQL queries for one database table. All methods are `async` and return plain JS objects/arrays from mysql2.

```
models/
├── News.js          # Table: news
│                    # Methods: findAll(limit), findLatest(limit),
│                    #          findBySlug(slug), count()
│
├── Attraction.js    # Table: attractions
│                    # Methods: findAll(), findFeatured(limit),
│                    #          findBySlug(slug)
│
└── GalleryItem.js   # Table: gallery_items
│                    # Methods: findAll(category), findRecent(limit),
│                    #          getCategories()
```

---

## `routes/`

Route definitions only — no business logic. Imports controllers and wires HTTP methods + URLs to handler functions.

```
routes/
├── index.js    # Public routes: /, /news, /news/:slug,
│               # /attractions, /attractions/:slug, /gallery,
│               # /about, /contact (GET + POST)
│
└── admin.js    # Admin routes: /admin/login (GET + POST), /admin/logout
│               # Protected: /admin, /admin/dashboard, /admin/news,
│               # /admin/attractions, /admin/gallery
│               # Uses requireAdmin middleware for all protected routes.
```

---

## `middleware/`

Express middleware functions applied in the request pipeline.

```
middleware/
├── authMiddleware.js     # requireAdmin(req, res, next)
│                         # Checks req.session.isAdmin === true.
│                         # On failure: saves returnTo URL in session,
│                         # redirects to /admin/login.
│
└── errorMiddleware.js    # notFoundHandler — creates a 404 error and calls next(err).
│                         # errorHandler — global error handler (4 args).
│                         # Renders views/pages/error.ejs with status code,
│                         # user-friendly message, and (dev only) technical detail.
```

---

## `views/`

EJS templates. All templates use express-ejs-layouts. The layout is set per-route via the `layout` render option (defaults to `layouts/main`).

```
views/
├── layouts/
│   ├── main.ejs        # Public page layout: head → navbar → <main> → footer
│   │                   # Injects Bootstrap 5 JS and /js/main.js at the bottom.
│   └── admin.ejs       # Admin panel layout: sidebar + topbar + content area.
│                       # Includes mobile sidebar toggle.
│
├── partials/
│   ├── head.ejs        # HTML <head>: charset, viewport, SEO meta, Open Graph,
│   │                   # Twitter Card, canonical URL, Google Fonts, Bootstrap CSS,
│   │                   # Bootstrap Icons, custom style.css, SVG favicon.
│   ├── navbar.ejs      # Sticky top navbar: SVG village crest, brand name,
│   │                   # Georgian navigation links, mobile collapse toggle.
│   └── footer.ejs      # Deep navy footer: 4-column grid (about, nav, contact,
│                       # working hours), gold accent separator, copyright bar.
│
├── pages/
│   ├── home.ejs              # Homepage: hero → news preview → attractions
│   │                         # preview → gallery preview → about preview → CTA.
│   ├── news.ejs              # News article listing grid.
│   ├── news-article.ejs      # Single news article with full content.
│   ├── attractions.ejs       # Attractions grid listing.
│   ├── attraction-detail.ejs # Single attraction with sidebar details.
│   ├── gallery.ejs           # Photo gallery with category filter + lightbox.
│   ├── about.ejs             # About Ujarma — history, facts, administration.
│   ├── contact.ejs           # Contact form with info block and validation.
│   └── error.ejs             # Unified error page (404, 403, 500).
│
└── admin/
    ├── login.ejs        # Standalone login page (layout: false). Full-page navy
    │                    # background with centred card.
    ├── dashboard.ejs    # Summary stats cards + quick-action links + system info.
    ├── news.ejs         # News management table (read-only, CRUD scaffolded).
    ├── attractions.ejs  # Attractions management table (read-only, CRUD scaffolded).
    └── gallery.ejs      # Gallery image grid (read-only, upload scaffolded).
```

---

## `public/`

Static assets served directly by Express at the `/` path prefix.

```
public/
├── css/
│   └── style.css       # Complete custom design system (~700 lines).
│                       # CSS custom properties (design tokens), typography,
│                       # layout utilities, component styles, admin styles,
│                       # responsive breakpoints (mobile-first below 992px).
│
├── js/
│   └── main.js         # Client-side JS (IIFE, no build tool required).
│                       # Features: navbar scroll shadow, active link detection,
│                       # hero scroll indicator, gallery lightbox, admin mobile
│                       # sidebar toggle, alert dismiss.
│
└── images/
    └── .gitkeep        # Holds og-home.jpg, og-default.jpg, favicon.ico.
                        # Replace .gitkeep with actual images before deploying.
```

---

## `uploads/`

Destination directory for Multer-managed file uploads.

```
uploads/
└── .gitkeep    # The directory is tracked in git; individual files are not
                # (excluded by .gitignore: uploads/* / !uploads/.gitkeep).
                # Uploaded filenames are: <timestamp>-<random>.<ext>
```

---

## `docs/`

Developer documentation. Kept in sync with the codebase.

```
docs/
├── ROUTES.md             # Full route map with method, URL, controller, view, auth.
├── DATABASE.md           # Schema for all 8 tables with columns, indexes, FK docs.
├── PROJECT_STRUCTURE.md  # This file — folder-by-folder explanation.
└── CHANGELOG.md          # Chronological version history and change log.
```

---

## Architecture Overview

```
HTTP Request
     │
     ▼
  app.js
  (Express)
     │
     ├── Helmet (security headers)
     ├── compression (gzip)
     ├── express.json / urlencoded (body parsing)
     ├── express-session (cookie-based sessions)
     ├── express.static (public/ assets)
     ├── express.static (uploads/ files)
     ├── express-ejs-layouts (layout wrapping)
     └── res.locals middleware (currentPath, siteName, etc.)
     │
     ▼
  routes/index.js          routes/admin.js
  (public routes)          (admin routes)
     │                          │
     │                    authMiddleware.requireAdmin
     │                          │
     ▼                          ▼
  controllers/             controllers/adminController.js
     │
     ▼
  models/                  config/db.js (mysql2 pool)
  (SQL queries)
     │
     ▼
  res.render(view, data)
     │
     ▼
  views/layouts/main.ejs   views/layouts/admin.ejs
  (wraps <%- body %>)
     │
     ▼
  HTML Response
```
