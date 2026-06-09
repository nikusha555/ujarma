# Route Map — Ujarma Official Village Website

> **Maintenance rule:** Update this file whenever a route is added, removed, or renamed in `routes/index.js` or `routes/admin.js`.

---

## Public Routes

All public routes are registered in `routes/index.js` and mounted at `/` in `app.js`.

---

### Home

| Field | Value |
|---|---|
| **Method** | `GET` |
| **URL** | `/` |
| **Controller** | `controllers/homeController.js` → `getHome` |
| **View** | `views/pages/home.ejs` |
| **Layout** | `views/layouts/main.ejs` |
| **Auth Required** | No |

**Description:** Renders the homepage. Fetches the three latest news articles, three featured attractions, and eight recent gallery items in parallel. Each fetch falls back to an empty array if the database is unavailable.

---

### News Listing

| Field | Value |
|---|---|
| **Method** | `GET` |
| **URL** | `/news` |
| **Controller** | `controllers/newsController.js` → `getNews` |
| **View** | `views/pages/news.ejs` |
| **Layout** | `views/layouts/main.ejs` |
| **Auth Required** | No |

**Description:** Renders a grid of all published news articles (up to 20), ordered newest first.

---

### News Article Detail

| Field | Value |
|---|---|
| **Method** | `GET` |
| **URL** | `/news/:slug` |
| **Controller** | `controllers/newsController.js` → `getNewsArticle` |
| **View** | `views/pages/news-article.ejs` |
| **Layout** | `views/layouts/main.ejs` |
| **Auth Required** | No |
| **URL Params** | `slug` — unique article identifier |

**Description:** Fetches a single published article by its URL slug. Returns 404 if not found or not published.

---

### Attractions Listing

| Field | Value |
|---|---|
| **Method** | `GET` |
| **URL** | `/attractions` |
| **Controller** | `controllers/attractionsController.js` → `getAttractions` |
| **View** | `views/pages/attractions.ejs` |
| **Layout** | `views/layouts/main.ejs` |
| **Auth Required** | No |

**Description:** Renders all published attractions. Featured items are sorted first, then alphabetically.

---

### Attraction Detail

| Field | Value |
|---|---|
| **Method** | `GET` |
| **URL** | `/attractions/:slug` |
| **Controller** | `controllers/attractionsController.js` → `getAttractionDetail` |
| **View** | `views/pages/attraction-detail.ejs` |
| **Layout** | `views/layouts/main.ejs` |
| **Auth Required** | No |
| **URL Params** | `slug` — unique attraction identifier |

**Description:** Fetches a single published attraction by slug. Returns 404 if not found.

---

### Gallery

| Field | Value |
|---|---|
| **Method** | `GET` |
| **URL** | `/gallery` |
| **Controller** | `controllers/galleryController.js` → `getGallery` |
| **View** | `views/pages/gallery.ejs` |
| **Layout** | `views/layouts/main.ejs` |
| **Auth Required** | No |
| **Query Params** | `category` (optional) — filter images by category name |

**Description:** Renders the photo gallery with optional category filtering. Also fetches all distinct category names for the filter bar.

---

### About Ujarma

| Field | Value |
|---|---|
| **Method** | `GET` |
| **URL** | `/about` |
| **Controller** | `controllers/aboutController.js` → `getAbout` |
| **View** | `views/pages/about.ejs` |
| **Layout** | `views/layouts/main.ejs` |
| **Auth Required** | No |

**Description:** Static informational page about Ujarma village — history, geography, and administration overview.

---

### Contact — Display Form

| Field | Value |
|---|---|
| **Method** | `GET` |
| **URL** | `/contact` |
| **Controller** | `controllers/contactController.js` → `getContact` |
| **View** | `views/pages/contact.ejs` |
| **Layout** | `views/layouts/main.ejs` |
| **Auth Required** | No |
| **Query Params** | `success=true` (optional) — shows success message after redirect |

---

### Contact — Submit Form

| Field | Value |
|---|---|
| **Method** | `POST` |
| **URL** | `/contact` |
| **Controller** | `controllers/contactController.js` → `postContact` |
| **View** | `views/pages/contact.ejs` (on validation failure) |
| **Layout** | `views/layouts/main.ejs` |
| **Auth Required** | No |
| **Body Params** | `name`, `email`, `subject` (optional), `message` |
| **Success Redirect** | `GET /contact?success=true` |

**Description:** Validates name, email (format), and message. Re-renders the form with an error message on failure. On success, redirects with `?success=true` (Post-Redirect-Get pattern prevents duplicate submissions).

---

## Admin Routes

All admin routes are registered in `routes/admin.js` and mounted at `/admin` in `app.js`.

---

### Admin Login — Display

| Field | Value |
|---|---|
| **Method** | `GET` |
| **URL** | `/admin/login` |
| **Controller** | `controllers/adminController.js` → `getAdminLogin` |
| **View** | `views/admin/login.ejs` |
| **Layout** | `false` (standalone page, no layout wrapper) |
| **Auth Required** | No |

**Description:** Shows the admin login form. Redirects to `/admin` if already authenticated.

---

### Admin Login — Submit

| Field | Value |
|---|---|
| **Method** | `POST` |
| **URL** | `/admin/login` |
| **Controller** | `controllers/adminController.js` → `postAdminLogin` |
| **View** | `views/admin/login.ejs` (on failure) |
| **Layout** | `false` |
| **Auth Required** | No |
| **Body Params** | `username`, `password` |
| **Success Redirect** | `GET /admin` (or `req.session.returnTo` if set) |

**Description:** Validates credentials against `ADMIN_USERNAME` / `ADMIN_PASSWORD` environment variables. Sets `req.session.isAdmin = true` on success.

---

### Admin Logout

| Field | Value |
|---|---|
| **Method** | `GET` |
| **URL** | `/admin/logout` |
| **Controller** | `controllers/adminController.js` → `getAdminLogout` |
| **View** | — (redirect only) |
| **Auth Required** | No |
| **Redirect** | `GET /admin/login` |

**Description:** Destroys the current session and redirects to the login page.

---

### Admin Dashboard

| Field | Value |
|---|---|
| **Method** | `GET` |
| **URL** | `/admin` and `/admin/dashboard` |
| **Controller** | `controllers/adminController.js` → `getDashboard` |
| **View** | `views/admin/dashboard.ejs` |
| **Layout** | `views/layouts/admin.ejs` |
| **Auth Required** | **Yes** — `requireAdmin` middleware |

**Description:** Displays summary statistics (total news count, attractions count, gallery count) and quick-action links.

---

### Admin News Management

| Field | Value |
|---|---|
| **Method** | `GET` |
| **URL** | `/admin/news` |
| **Controller** | `controllers/adminController.js` → `getAdminNews` |
| **View** | `views/admin/news.ejs` |
| **Layout** | `views/layouts/admin.ejs` |
| **Auth Required** | **Yes** |

**Description:** Lists all news articles (up to 50) in a management table. CRUD operations are scaffolded for the next development phase.

---

### Admin Attractions Management

| Field | Value |
|---|---|
| **Method** | `GET` |
| **URL** | `/admin/attractions` |
| **Controller** | `controllers/adminController.js` → `getAdminAttractions` |
| **View** | `views/admin/attractions.ejs` |
| **Layout** | `views/layouts/admin.ejs` |
| **Auth Required** | **Yes** |

**Description:** Lists all attractions with featured/published status. CRUD operations scaffolded.

---

### Admin Gallery Management

| Field | Value |
|---|---|
| **Method** | `GET` |
| **URL** | `/admin/gallery` |
| **Controller** | `controllers/adminController.js` → `getAdminGallery` |
| **View** | `views/admin/gallery.ejs` |
| **Layout** | `views/layouts/admin.ejs` |
| **Auth Required** | **Yes** |

**Description:** Shows all gallery images in a grid. Upload functionality is scaffolded via `config/multer.js`.

---

## Middleware

| Middleware | File | Applied To |
|---|---|---|
| `requireAdmin` | `middleware/authMiddleware.js` | All `/admin/*` routes except login and logout |
| `notFoundHandler` | `middleware/errorMiddleware.js` | Catch-all (registered after all routes) |
| `errorHandler` | `middleware/errorMiddleware.js` | Global error handler (registered last) |

---

## Error Pages

| Status | Trigger | View |
|---|---|---|
| 404 | Route not matched | `views/pages/error.ejs` |
| 500 | Unhandled exception in controller | `views/pages/error.ejs` |
| 400 / 403 | Manually set `err.status` | `views/pages/error.ejs` |
