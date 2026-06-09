# Database Schema — Ujarma Official Village Website

> **Maintenance rule:** Update this file whenever a table is created, altered, or dropped in `config/bootstrap.js` or `config/schema.sql`.

---

## Overview

| Property | Value |
|---|---|
| **Engine** | MySQL 8+ / MariaDB 10.5+ |
| **Character Set** | `utf8mb4` |
| **Collation** | `utf8mb4_unicode_ci` |
| **Connection** | Managed via `mysql2/promise` pool in `config/db.js` |
| **Bootstrap** | Database, tables, and seed data are created automatically on startup via `config/bootstrap.js` |

---

## Table Index

| Table | Purpose |
|---|---|
| [`admins`](#admins) | Administrator accounts |
| [`categories`](#categories) | News article categories |
| [`news`](#news) | News articles and announcements |
| [`attractions`](#attractions) | Tourist attractions and points of interest |
| [`attraction_images`](#attraction_images) | Additional images for individual attractions |
| [`gallery_categories`](#gallery_categories) | Photo gallery categories |
| [`gallery_items`](#gallery_items) | Photo gallery images |
| [`contact_messages`](#contact_messages) | Submitted contact form messages |

---

## Tables

---

### `admins`

Stores administrator user accounts. Passwords are stored as bcrypt hashes (cost factor 12).

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `INT UNSIGNED` | No | auto_increment | Primary key |
| `username` | `VARCHAR(100)` | No | — | Unique login name |
| `password_hash` | `VARCHAR(255)` | No | — | bcrypt hash, cost 12 |
| `created_at` | `DATETIME` | No | `CURRENT_TIMESTAMP` | Record creation time |

**Indexes:**
- `PRIMARY KEY (id)`
- `UNIQUE KEY uq_admins_username (username)`

**Relationships:** None (standalone credential store).

**Seed data:** One default admin created from `ADMIN_USERNAME` / `ADMIN_PASSWORD` environment variables.

---

### `categories`

News article categories used for filtering and organisation.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `INT UNSIGNED` | No | auto_increment | Primary key |
| `name` | `VARCHAR(100)` | No | — | Display name (unique) |
| `slug` | `VARCHAR(100)` | No | — | URL-safe identifier (unique) |
| `created_at` | `DATETIME` | No | `CURRENT_TIMESTAMP` | — |

**Indexes:**
- `PRIMARY KEY (id)`
- `UNIQUE KEY uq_categories_name (name)`
- `UNIQUE KEY uq_categories_slug (slug)`

**Relationships:**
- Referenced by `news.category_id → categories.id`

**Seed data:** Announcements, Development, Culture, Events.

---

### `news`

News articles and official announcements published on the website.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `INT UNSIGNED` | No | auto_increment | Primary key |
| `category_id` | `INT UNSIGNED` | Yes | `NULL` | FK → `categories.id` |
| `title` | `VARCHAR(255)` | No | — | Article headline |
| `slug` | `VARCHAR(255)` | No | — | Unique URL identifier |
| `content` | `LONGTEXT` | No | — | Full HTML body |
| `excerpt` | `VARCHAR(500)` | Yes | `NULL` | Short summary for cards |
| `image` | `VARCHAR(255)` | Yes | `NULL` | Filename in `uploads/` |
| `is_published` | `TINYINT(1)` | No | `1` | `1` = live, `0` = draft |
| `published_at` | `DATETIME` | No | `CURRENT_TIMESTAMP` | Display date |
| `created_at` | `DATETIME` | No | `CURRENT_TIMESTAMP` | Record creation |
| `updated_at` | `DATETIME` | No | `CURRENT_TIMESTAMP ON UPDATE` | Last modification |

**Indexes:**
- `PRIMARY KEY (id)`
- `UNIQUE KEY uq_news_slug (slug)`
- `KEY idx_news_published (is_published, published_at)`

**Foreign Keys:**
```
news.category_id → categories.id  ON DELETE SET NULL
```

**Relationships:**
- Belongs to one `categories` record (nullable).

**Seed data:** One welcome article assigned to the "Announcements" category.

---

### `attractions`

Tourist attractions, historical landmarks, and points of interest.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `INT UNSIGNED` | No | auto_increment | Primary key |
| `name` | `VARCHAR(255)` | No | — | Attraction name |
| `slug` | `VARCHAR(255)` | No | — | Unique URL identifier |
| `description` | `TEXT` | No | — | Full description |
| `image` | `VARCHAR(255)` | Yes | `NULL` | Cover image filename in `uploads/` |
| `category` | `VARCHAR(100)` | Yes | `NULL` | Freeform category label |
| `is_featured` | `TINYINT(1)` | No | `0` | `1` = shown on homepage |
| `is_published` | `TINYINT(1)` | No | `1` | `1` = publicly visible |
| `created_at` | `DATETIME` | No | `CURRENT_TIMESTAMP` | — |
| `updated_at` | `DATETIME` | No | `CURRENT_TIMESTAMP ON UPDATE` | — |

**Indexes:**
- `PRIMARY KEY (id)`
- `UNIQUE KEY uq_attractions_slug (slug)`
- `KEY idx_attractions_featured (is_featured, is_published)`

**Foreign Keys:** None.

**Seed data:** One record — "Ujarma Fortress" (featured).

---

### `attraction_images`

Additional photograph gallery for individual attractions (carousel / lightbox).

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `INT UNSIGNED` | No | auto_increment | Primary key |
| `attraction_id` | `INT UNSIGNED` | No | — | FK → `attractions.id` |
| `image` | `VARCHAR(255)` | No | — | Filename in `uploads/` |
| `caption` | `VARCHAR(255)` | Yes | `NULL` | Optional image caption |
| `sort_order` | `INT` | No | `0` | Display order (ASC) |
| `created_at` | `DATETIME` | No | `CURRENT_TIMESTAMP` | — |

**Indexes:**
- `PRIMARY KEY (id)`
- `KEY idx_attraction_images_attraction (attraction_id)`

**Foreign Keys:**
```
attraction_images.attraction_id → attractions.id  ON DELETE CASCADE
```

**Relationships:**
- Belongs to one `attractions` record.
- Cascades on delete: removing an attraction also removes all its images.

**Seed data:** None.

---

### `gallery_categories`

Categories for organising the photo gallery (e.g. Landscapes, Architecture).

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `INT UNSIGNED` | No | auto_increment | Primary key |
| `name` | `VARCHAR(100)` | No | — | Display name (unique) |
| `slug` | `VARCHAR(100)` | No | — | URL-safe identifier (unique) |
| `created_at` | `DATETIME` | No | `CURRENT_TIMESTAMP` | — |

**Indexes:**
- `PRIMARY KEY (id)`
- `UNIQUE KEY uq_gallery_categories_name (name)`
- `UNIQUE KEY uq_gallery_categories_slug (slug)`

**Foreign Keys:** None.

**Seed data:** Landscapes, Village Life, Architecture, Seasons.

---

### `gallery_items`

Individual photos shown in the public gallery.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `INT UNSIGNED` | No | auto_increment | Primary key |
| `category_id` | `INT UNSIGNED` | Yes | `NULL` | FK → `gallery_categories.id` |
| `title` | `VARCHAR(255)` | No | — | Image caption / alt text |
| `image` | `VARCHAR(255)` | No | — | Filename in `uploads/` |
| `created_at` | `DATETIME` | No | `CURRENT_TIMESTAMP` | — |

**Indexes:**
- `PRIMARY KEY (id)`
- `KEY idx_gallery_items_category (category_id)`

**Foreign Keys:**
```
gallery_items.category_id → gallery_categories.id  ON DELETE SET NULL
```

**Relationships:**
- Belongs to one `gallery_categories` record (nullable — uncategorised items still appear in gallery).

**Seed data:** One placeholder item in the "Landscapes" category.

---

### `contact_messages`

Stores messages submitted through the public contact form.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `INT UNSIGNED` | No | auto_increment | Primary key |
| `name` | `VARCHAR(255)` | No | — | Sender full name |
| `email` | `VARCHAR(255)` | No | — | Sender email address |
| `subject` | `VARCHAR(255)` | Yes | `NULL` | Optional message subject |
| `message` | `TEXT` | No | — | Message body |
| `is_read` | `TINYINT(1)` | No | `0` | `0` = unread, `1` = read by admin |
| `created_at` | `DATETIME` | No | `CURRENT_TIMESTAMP` | Submission timestamp |

**Indexes:**
- `PRIMARY KEY (id)`
- `KEY idx_contact_messages_read (is_read)`

**Foreign Keys:** None.

**Seed data:** None.

---

## Entity Relationship Diagram (text)

```
admins
  └─ (standalone)

categories
  └─ news (category_id → categories.id, SET NULL on delete)

attractions
  └─ attraction_images (attraction_id → attractions.id, CASCADE on delete)

gallery_categories
  └─ gallery_items (category_id → gallery_categories.id, SET NULL on delete)

contact_messages
  └─ (standalone)
```

---

## Bootstrap Behaviour

The file `config/bootstrap.js` runs on every application startup and is fully idempotent:

1. Opens a connection **without** selecting a database.
2. Checks `information_schema.SCHEMATA` for the target database name (`DB_NAME` env var).
3. Creates the database if absent (`CREATE DATABASE … CHARACTER SET utf8mb4`).
4. Switches to the database (`USE \`ujarma\``).
5. Executes each `CREATE TABLE IF NOT EXISTS` statement using `conn.query()` (not `execute()` — MySQL does not support DDL over the prepared-statement protocol).
6. Checks each seeded table with `SELECT 1 FROM table LIMIT 1` before inserting.
7. Inserts seed data only into empty tables.
8. Closes the bootstrap connection; the shared pool in `config/db.js` takes over.

> **Note on `query()` vs `execute()`:** DDL commands (`CREATE DATABASE`, `CREATE TABLE`, `USE`) must use `conn.query()`. DML commands with `?` placeholders (`INSERT`, `SELECT`) use `conn.execute()` for safe parameterisation.
