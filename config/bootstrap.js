/**
 * config/bootstrap.js — Automatic Database Bootstrap
 * =====================================================
 * Runs once at application startup before Express begins
 * accepting requests. Handles the full lifecycle:
 *
 *   1. Connect to MySQL server (no database selected)
 *   2. Create the target database if it does not exist
 *   3. Switch to the database
 *   4. Create all required tables (CREATE TABLE IF NOT EXISTS)
 *   5. Insert seed data into empty tables
 *   6. Close the bootstrap connection (main pool takes over)
 *
 * Design decisions:
 *   - Uses a dedicated single connection — not the shared pool —
 *     so the pool is never touched before the DB exists.
 *   - Every step is idempotent: safe to run on every startup.
 *   - Throws on hard failures so app.js can abort before binding
 *     the HTTP port.
 */

import mysql    from 'mysql2/promise';
import bcrypt   from 'bcryptjs';
import dotenv   from 'dotenv';

dotenv.config();

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Print a labelled log line to stdout.
 * @param {'ok'|'created'|'skip'|'info'|'error'} type
 * @param {string} message
 */
const log = (type, message) => {
  const symbols = {
    ok:      '  \x1b[32m✓\x1b[0m',
    created: '  \x1b[36m+\x1b[0m',
    skip:    '  \x1b[33m–\x1b[0m',
    info:    '  \x1b[34m•\x1b[0m',
    error:   '  \x1b[31m✗\x1b[0m',
  };
  console.log(`${symbols[type] ?? '   '} ${message}`);
};

// ─────────────────────────────────────────────
// DDL — Table Definitions
// ─────────────────────────────────────────────

/**
 * Returns an ordered array of CREATE TABLE IF NOT EXISTS statements.
 * Order matters: tables with foreign-key dependencies come after
 * the tables they reference.
 */
const getTableDefinitions = () => [

  // ── admins ────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS admins (
    id            INT UNSIGNED      NOT NULL AUTO_INCREMENT,
    username      VARCHAR(100)      NOT NULL,
    password_hash VARCHAR(255)      NOT NULL,
    created_at    DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_admins_username (username)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── categories (news categories) ─────────────
  `CREATE TABLE IF NOT EXISTS categories (
    id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name       VARCHAR(100) NOT NULL,
    slug       VARCHAR(100) NOT NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_categories_name (name),
    UNIQUE KEY uq_categories_slug (slug)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── news ──────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS news (
    id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
    category_id  INT UNSIGNED          DEFAULT NULL,
    title        VARCHAR(255) NOT NULL,
    slug         VARCHAR(255) NOT NULL,
    content      LONGTEXT     NOT NULL,
    excerpt      VARCHAR(500)          DEFAULT NULL,
    image        VARCHAR(255)          DEFAULT NULL,
    is_published TINYINT(1)   NOT NULL DEFAULT 1,
    published_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_news_slug (slug),
    KEY idx_news_published (is_published, published_at),
    CONSTRAINT fk_news_category
      FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── attractions ───────────────────────────────
  `CREATE TABLE IF NOT EXISTS attractions (
    id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name         VARCHAR(255) NOT NULL,
    slug         VARCHAR(255) NOT NULL,
    description  TEXT         NOT NULL,
    image        VARCHAR(255)          DEFAULT NULL,
    category     VARCHAR(100)          DEFAULT NULL,
    is_featured  TINYINT(1)   NOT NULL DEFAULT 0,
    is_published TINYINT(1)   NOT NULL DEFAULT 1,
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_attractions_slug (slug),
    KEY idx_attractions_featured (is_featured, is_published)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── attraction_images ─────────────────────────
  `CREATE TABLE IF NOT EXISTS attraction_images (
    id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
    attraction_id INT UNSIGNED NOT NULL,
    image         VARCHAR(255) NOT NULL,
    caption       VARCHAR(255)          DEFAULT NULL,
    sort_order    INT          NOT NULL DEFAULT 0,
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_attraction_images_attraction (attraction_id),
    CONSTRAINT fk_attraction_images_attraction
      FOREIGN KEY (attraction_id) REFERENCES attractions (id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── gallery_categories ────────────────────────
  `CREATE TABLE IF NOT EXISTS gallery_categories (
    id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name       VARCHAR(100) NOT NULL,
    slug       VARCHAR(100) NOT NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_gallery_categories_name (name),
    UNIQUE KEY uq_gallery_categories_slug (slug)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── gallery_items ─────────────────────────────
  `CREATE TABLE IF NOT EXISTS gallery_items (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    category_id INT UNSIGNED          DEFAULT NULL,
    title       VARCHAR(255) NOT NULL,
    image       VARCHAR(255) NOT NULL,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_gallery_items_category (category_id),
    CONSTRAINT fk_gallery_items_category
      FOREIGN KEY (category_id) REFERENCES gallery_categories (id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── contact_messages ──────────────────────────
  `CREATE TABLE IF NOT EXISTS contact_messages (
    id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name       VARCHAR(255) NOT NULL,
    email      VARCHAR(255) NOT NULL,
    subject    VARCHAR(255)          DEFAULT NULL,
    message    TEXT         NOT NULL,
    is_read    TINYINT(1)   NOT NULL DEFAULT 0,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_contact_messages_read (is_read)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

// ─────────────────────────────────────────────
// Step 1 — Database Creation
// ─────────────────────────────────────────────

/**
 * Create the target database if it does not already exist.
 * Uses the connection *before* `USE <database>` so this works
 * even when the DB is brand-new.
 * @param {mysql.Connection} conn
 * @param {string} dbName
 */
const ensureDatabase = async (conn, dbName) => {
  // Check existence via information_schema (avoids needing SHOW DATABASES privilege)
  const [rows] = await conn.execute(
    `SELECT SCHEMA_NAME
       FROM information_schema.SCHEMATA
      WHERE SCHEMA_NAME = ?
      LIMIT 1`,
    [dbName]
  );

  if (rows.length === 0) {
    // Database does not exist — create it.
    // Must use query() — DDL is not supported by the prepared-statement protocol.
    await conn.query(
      `CREATE DATABASE \`${dbName}\`
       CHARACTER SET utf8mb4
       COLLATE utf8mb4_unicode_ci`
    );
    log('created', `Database "${dbName}" created`);
  } else {
    log('skip', `Database "${dbName}" already exists`);
  }
};

// ─────────────────────────────────────────────
// Step 2 — Table Creation
// ─────────────────────────────────────────────

/**
 * Execute all CREATE TABLE IF NOT EXISTS statements.
 * The connection must already be using the target database.
 * @param {mysql.Connection} conn
 */
const ensureTables = async (conn) => {
  const definitions = getTableDefinitions();

  for (const ddl of definitions) {
    // Extract table name for the log message
    const match = ddl.match(/CREATE TABLE IF NOT EXISTS\s+(\w+)/i);
    const tableName = match ? match[1] : '(unknown)';

    // query() is required for DDL — execute() uses prepared statements
    // which MySQL does not support for CREATE TABLE / ALTER TABLE / DROP TABLE.
    await conn.query(ddl);
    log('ok', `Table "${tableName}" verified`);
  }
};

// ─────────────────────────────────────────────
// Step 3 — Seed Data
// ─────────────────────────────────────────────

/**
 * Check whether a table contains any rows.
 * @param {mysql.Connection} conn
 * @param {string} table
 * @returns {Promise<boolean>} true if the table is empty
 */
const isEmpty = async (conn, table) => {
  const [rows] = await conn.execute(
    `SELECT 1 FROM \`${table}\` LIMIT 1`
  );
  return rows.length === 0;
};

/**
 * Insert all seed data. Each block is guarded by an isEmpty()
 * check so repeated startups never duplicate records.
 * @param {mysql.Connection} conn
 */
const seedData = async (conn) => {

  // ── Default Admin ────────────────────────────
  if (await isEmpty(conn, 'admins')) {
    const username  = process.env.ADMIN_USERNAME || 'admin';
    const plainPass = process.env.ADMIN_PASSWORD || 'Admin@Ujarma1';
    const hash      = await bcrypt.hash(plainPass, 12);

    await conn.execute(
      'INSERT INTO admins (username, password_hash) VALUES (?, ?)',
      [username, hash]
    );
    log('created', `Seed: admin account "${username}" created`);
  } else {
    log('skip', 'Seed: admins — already populated');
  }

  // ── News Categories ──────────────────────────
  if (await isEmpty(conn, 'categories')) {
    const cats = [
      ['Announcements', 'announcements'],
      ['Development',   'development'],
      ['Culture',       'culture'],
      ['Events',        'events'],
    ];
    for (const [name, slug] of cats) {
      await conn.execute(
        'INSERT INTO categories (name, slug) VALUES (?, ?)',
        [name, slug]
      );
    }
    log('created', 'Seed: news categories inserted (4 records)');
  } else {
    log('skip', 'Seed: categories — already populated');
  }

  // ── Sample News Article ──────────────────────
  if (await isEmpty(conn, 'news')) {
    // Fetch the "Announcements" category id
    const [catRows] = await conn.execute(
      "SELECT id FROM categories WHERE slug = 'announcements' LIMIT 1"
    );
    const catId = catRows[0]?.id ?? null;

    await conn.execute(
      `INSERT INTO news
         (category_id, title, slug, content, excerpt, is_published, published_at)
       VALUES
         (?, ?, ?, ?, ?, 1, NOW())`,
      [
        catId,
        'Welcome to the Official Ujarma Village Portal',
        'welcome-to-the-official-ujarma-village-portal',
        `<p>We are pleased to announce the launch of the official information portal for Ujarma Village.</p>
<p>This platform will serve as the primary source of authoritative news, administrative announcements, and community information for residents and visitors alike.</p>
<p>Through this portal, the Ujarma Village Administration commits to transparent, timely, and accurate communication with all stakeholders.</p>`,
        'The official information portal of Ujarma Village is now live. Stay informed with the latest news and administrative announcements.',
      ]
    );
    log('created', 'Seed: sample news article inserted');
  } else {
    log('skip', 'Seed: news — already populated');
  }

  // ── Sample Attraction ────────────────────────
  if (await isEmpty(conn, 'attractions')) {
    await conn.execute(
      `INSERT INTO attractions
         (name, slug, description, category, is_featured, is_published)
       VALUES
         (?, ?, ?, ?, 1, 1)`,
      [
        'Ujarma Fortress',
        'ujarma-fortress',
        'The Ujarma Fortress is a medieval royal residence located on the right bank of the Iori River in eastern Georgia. Dating back to the early centuries CE, it served as one of the primary fortifications of the early Georgian Kingdom and remains a significant archaeological and historical landmark. The fortress complex includes residential towers, a church, and extensive defensive walls that offer panoramic views of the surrounding Kakheti landscape.',
        'Historical Landmark',
      ]
    );
    log('created', 'Seed: sample attraction "Ujarma Fortress" inserted');
  } else {
    log('skip', 'Seed: attractions — already populated');
  }

  // ── Gallery Categories ───────────────────────
  if (await isEmpty(conn, 'gallery_categories')) {
    const galCats = [
      ['Landscapes',   'landscapes'],
      ['Village Life', 'village-life'],
      ['Architecture', 'architecture'],
      ['Seasons',      'seasons'],
    ];
    for (const [name, slug] of galCats) {
      await conn.execute(
        'INSERT INTO gallery_categories (name, slug) VALUES (?, ?)',
        [name, slug]
      );
    }
    log('created', 'Seed: gallery categories inserted (4 records)');
  } else {
    log('skip', 'Seed: gallery_categories — already populated');
  }

  // ── Sample Gallery Item ──────────────────────
  if (await isEmpty(conn, 'gallery_items')) {
    // Fetch the "Landscapes" gallery category
    const [galCatRows] = await conn.execute(
      "SELECT id FROM gallery_categories WHERE slug = 'landscapes' LIMIT 1"
    );
    const galCatId = galCatRows[0]?.id ?? null;

    await conn.execute(
      'INSERT INTO gallery_items (category_id, title, image) VALUES (?, ?, ?)',
      [galCatId, 'Panoramic View of Ujarma', 'placeholder-landscape.jpg']
    );
    log('created', 'Seed: sample gallery item inserted');
  } else {
    log('skip', 'Seed: gallery_items — already populated');
  }
};

// ─────────────────────────────────────────────
// Main Bootstrap Function (exported)
// ─────────────────────────────────────────────

/**
 * bootstrap()
 * -----------
 * The single entry-point called by app.js before the HTTP server
 * starts listening. Opens a dedicated connection (no `database`
 * specified so MySQL doesn't reject the connection when the DB
 * doesn't exist yet), runs all steps, then closes that connection.
 *
 * @throws {Error} if MySQL is unreachable or a fatal SQL error occurs.
 */
const bootstrap = async () => {
  const dbName = process.env.DB_NAME || 'ujarma';

  console.log('\n  ┌─ Bootstrap ────────────────────────────────┐');

  // ── Open a connection WITHOUT a target database ──
  let conn;
  try {
    conn = await mysql.createConnection({
      host:     process.env.DB_HOST     || 'localhost',
      port:     parseInt(process.env.DB_PORT || '3306', 10),
      user:     process.env.DB_USER     || 'root',
      password: process.env.DB_PASSWORD || '',
      // No `database` option — we may need to create it first
      timezone: '+00:00',
      charset:  'utf8mb4',
    });
    log('ok', 'MySQL server connected');
  } catch (err) {
    log('error', `Cannot connect to MySQL: ${err.message}`);
    throw err;
  }

  try {
    // ── Step 1: Database ──────────────────────────
    await ensureDatabase(conn, dbName);

    // ── Switch to the target database ─────────────
    // USE is a DDL-class command — must use query(), not execute().
    await conn.query(`USE \`${dbName}\``);

    // ── Step 2: Tables ────────────────────────────
    console.log('  ├─ Tables ───────────────────────────────────');
    await ensureTables(conn);

    // ── Step 3: Seed Data ─────────────────────────
    console.log('  ├─ Seed Data ─────────────────────────────────');
    await seedData(conn);

    console.log('  └─ Bootstrap complete ───────────────────────\n');

  } catch (err) {
    log('error', `Bootstrap failed: ${err.message}`);
    throw err;
  } finally {
    // Always close the bootstrap connection; the shared pool manages itself
    await conn.end();
  }
};

export default bootstrap;
