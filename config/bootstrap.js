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

  // ── news_media (multi-image / video gallery per article) ──
  // Mirrors the attraction_images pattern below. `news.image` /
  // `news.featured_image` remain as legacy "cover" columns kept in
  // sync by the admin controller for backward compatibility — every
  // other admin/public code path that only knows about a single
  // cover image keeps working unmodified.
  `CREATE TABLE IF NOT EXISTS news_media (
    id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    news_id    INT UNSIGNED NOT NULL,
    type       ENUM('image','video') NOT NULL DEFAULT 'image',
    file       VARCHAR(255) NOT NULL,
    is_cover   TINYINT(1)   NOT NULL DEFAULT 0,
    sort_order INT          NOT NULL DEFAULT 0,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_news_media_news (news_id),
    CONSTRAINT fk_news_media_news
      FOREIGN KEY (news_id) REFERENCES news (id) ON DELETE CASCADE
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
// Step 2b — Column Migrations
// ─────────────────────────────────────────────

/**
 * Idempotently add columns that were introduced after the initial schema.
 * Each migration checks information_schema before altering the table,
 * so this function is safe to run on every application startup.
 * @param {mysql.Connection} conn
 */
const ensureMigrations = async (conn) => {
  const dbName = process.env.DB_NAME || 'ujarma';

  // Helper: check whether a column already exists
  const columnExists = async (table, column) => {
    const [rows] = await conn.execute(
      `SELECT 1
         FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?
        LIMIT 1`,
      [dbName, table, column]
    );
    return rows.length > 0;
  };

  // ── news: is_featured ─────────────────────────
  if (!(await columnExists('news', 'is_featured'))) {
    await conn.query(
      `ALTER TABLE news ADD COLUMN is_featured TINYINT(1) NOT NULL DEFAULT 0
       AFTER is_published`
    );
    log('created', 'Migration: news.is_featured column added');
  } else {
    log('skip', 'Migration: news.is_featured — already exists');
  }

  // ── news: rename excerpt → summary (if excerpt exists but summary doesn't) ─
  // The public models use "excerpt"; the admin form calls it "summary".
  // We keep both: summary is a full copy. If summary is missing we add it.
  if (!(await columnExists('news', 'summary'))) {
    await conn.query(
      `ALTER TABLE news ADD COLUMN summary VARCHAR(500) DEFAULT NULL
       AFTER excerpt`
    );
    log('created', 'Migration: news.summary column added');
  } else {
    log('skip', 'Migration: news.summary — already exists');
  }

  // ── news: featured_image (alias path; old column was "image") ─────────────
  if (!(await columnExists('news', 'featured_image'))) {
    await conn.query(
      `ALTER TABLE news ADD COLUMN featured_image VARCHAR(255) DEFAULT NULL
       AFTER image`
    );
    log('created', 'Migration: news.featured_image column added');
  } else {
    log('skip', 'Migration: news.featured_image — already exists');
  }

  // ── news_media: backfill legacy single-image news into the new
  // multi-media table, as the cover image. Only touches news rows that
  // have a legacy image AND currently have zero news_media rows, so
  // this is safe to run on every startup — it never re-adds a row for
  // an article the admin has already migrated to real gallery media
  // (even if they later removed all of it), and never duplicates.
  const [legacyImageRows] = await conn.execute(
    `SELECT n.id AS news_id, COALESCE(n.featured_image, n.image) AS legacy_image
       FROM news n
       LEFT JOIN news_media nm ON nm.news_id = n.id
      WHERE COALESCE(n.featured_image, n.image) IS NOT NULL
        AND nm.id IS NULL
      GROUP BY n.id`
  );
  if (legacyImageRows.length > 0) {
    for (const row of legacyImageRows) {
      await conn.execute(
        `INSERT INTO news_media (news_id, type, file, is_cover, sort_order)
         VALUES (?, 'image', ?, 1, 0)`,
        [row.news_id, row.legacy_image]
      );
    }
    log('created', `Migration: backfilled ${legacyImageRows.length} legacy news image(s) into news_media`);
  } else {
    log('skip', 'Migration: news_media backfill — nothing to migrate');
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

  // ── News Categories (Georgian) ───────────────
  if (await isEmpty(conn, 'categories')) {
    const cats = [
      ['განცხადებები',   'announcements'],
      ['განვითარება',    'development'],
      ['კულტურა',        'culture'],
      ['ღონისძიებები',   'events'],
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

  // ── News Articles (Georgian, realistic content) ─
  if (await isEmpty(conn, 'news')) {
    const [catRows] = await conn.execute(
      "SELECT id, slug FROM categories WHERE slug IN ('announcements','culture','development') LIMIT 3"
    );
    const catMap = {};
    catRows.forEach((r) => { catMap[r.slug] = r.id; });
    const ann  = catMap['announcements'] ?? null;
    const cult = catMap['culture']       ?? null;
    const dev  = catMap['development']   ?? null;

    const articles = [
      {
        category_id:  ann,
        title:        'მოგესალმებათ უჯარმის ოფიციალური საინფორმაციო პორტალი',
        slug:         'mogvesalmebit-ujarmas-oficialuri-sainformacio-portali',
        content:      `<p>ძვირფასო უჯარმელებო და სტუმრებო,</p>
<p>დიდი სიამოვნებით გაცნობებთ, რომ მოქმედებაში შევიდა <strong>უჯარმის სოფლის ოფიციალური ციფრული პორტალი</strong>. ეს პლატფორმა წარმოადგენს სოფლის ადმინისტრაციის, მოსახლეობის და სტუმრების ერთიან ციფრულ სივრცეს.</p>
<h3>პორტალი გთავაზობთ:</h3>
<ul>
  <li>ადმინისტრაციის ოფიციალურ განცხადებებსა და გადაწყვეტილებებს</li>
  <li>სოფლის ისტორიასა და კულტურულ მემკვიდრეობაზე ინფორმაციას</li>
  <li>ტურისტულ მარშრუტებსა და ღირსშესანიშნაობების აღწერას</li>
  <li>ფოტო-გალერეას</li>
  <li>ადმინისტრაციასთან კონტაქტის შესაძლებლობას</li>
</ul>
<p>უჯარმის სოფლის ადმინისტრაცია მადლიერი იქნება ყველა შენიშვნისა და წინადადებისთვის, რომელიც ამ პლატფორმის გაუმჯობესებას შეუწყობს ხელს.</p>
<p>გთხოვთ, პორტალი გამოიყენოთ, დაუკავშირდეთ ადმინისტრაციას და გახდეთ სოფლის ციფრული ცხოვრების აქტიური მონაწილე.</p>
<p>პატივისცემით,<br>უჯარმის სოფლის ადმინისტრაცია</p>`,
        summary:      'უჯარმის სოფლის ოფიციალური ციფრული პორტალი მოქმედებაში შევიდა. პლატფორმა აერთიანებს ადმინისტრაციულ სერვისებს, სიახლეებს და ტურისტულ ინფორმაციას.',
        published_at: new Date('2024-01-15'),
      },
      {
        category_id:  cult,
        title:        'უჯარმის ციხე-სიმაგრე — კახეთის ისტორიული სიმბოლო',
        slug:         'ujarmas-tsikhe-simagre-kakhetis-istoriuli-simbolo',
        content:      `<p>უჯარმის ციხე-სიმაგრე ყველაზე ადრეული და ყველაზე შთამბეჭდავი ისტორიული ძეგლია, რომელიც სოფელ უჯარმას განასახიერებს. ციხის პირველი ნახსენები <strong>III–IV საუკუნეებს</strong> განეკუთვნება, მაგრამ სამეფო სიდიადე მან <strong>V საუკუნეში</strong> მოიპოვა — ვახტანგ გორგასლის მეფობის ხანაში.</p>
<p>ქართლ-კახეთის სამეფო ისტორიის ამ გამორჩეულ ეტაპზე, "ქართლის ცხოვრების" მიხედვით, ვახტანგ მეფე ხშირად ამ ციხე-სიმაგრეს ამოირჩევდა სამეფო სამყოფელად — განსაკუთრებით კახეთში ლაშქრობების და სანადიროდ გამოსვლის პერიოდებში. ეს ფაქტი ციხეს ისტორიული ნიშნის გარდა სულიერი მნიშვნელობასაც ანიჭებს.</p>
<h3>ციხის არქიტექტურა</h3>
<p>ნანგრევები გვიჩვენებს, რომ კომპლექსი მოიცავდა:</p>
<ul>
  <li>სასახლის ნაშთებს</li>
  <li>ადრეულ ქრისტიანულ ეკლესიას</li>
  <li>სამხედრო კოშკებსა და გალავნებს</li>
  <li>წყლის ობიექტებს</li>
</ul>
<p>ციხე იორის მარჯვენა ნაპირის კლდოვან ბორცვზე მდებარეობს, საიდანაც გაირინდება მდინარისა და ხეობის პანორამული ხედი. ამ ადგილს ფოტოგრაფები განსაკუთრებულ სიყვარულით ეპყრობიან — განსაკუთრებით გამთენიისას და მზის ჩასვლისას.</p>`,
        summary:      'III–IV საუკუნეებიდან V საუკუნის სამეფო რეზიდენციამდე — უჯარმის ციხე-სიმაგრის ისტორია კახეთის ყველაზე შთამბეჭდავ თავებს შეიცავს.',
        published_at: new Date('2024-02-20'),
      },
      {
        category_id:  dev,
        title:        'სოფლის ინფრასტრუქტურის განვითარების გეგმა 2024',
        slug:         'soflis-infrastruqturis-ganvitarebis-gegma-2024',
        content:      `<p>უჯარმის სოფლის ადმინისტრაცია აცხადებს <strong>2024 წლის ინფრასტრუქტურის განვითარების გეგმას</strong>. გეგმა შემუშავდა სოფლის მოსახლეობასთან კონსულტაციებისა და საჭიროებების შეფასების საფუძველზე.</p>
<h3>პრიორიტეტული მიმართულებები:</h3>
<h4>1. გზების მოწყობა</h4>
<p>სოფლის მთავარი შიდა გზების გასწვდომის გაუმჯობესება, ნიაღვრებისაგან დაზიანებული მონაკვეთების აღდგენა.</p>
<h4>2. სასმელი წყლის სისტემა</h4>
<p>სასმელი წყლის მაგისტრალის ნაწილობრივ განახლება და სისტემის საიმედოობის ამაღლება.</p>
<h4>3. ტურისტული ინფრასტრუქტურა</h4>
<p>ციხე-სიმაგრეზე მიმავალი ბილიკის მოწყობა, ინფო-სტენდების განთავსება, მითითებიანი ნიშნები.</p>
<h4>4. კომუნიკაციები</h4>
<p>სოფელში ინტერნეტ-ინფრასტრუქტურის გაუმჯობესება სახელმწიფო პროგრამის ფარგლებში.</p>
<p>ყველა სამუშაო განხორციელდება სახელმწიფო შესყიდვების კანონმდებლობის სრული დაცვით. ბიუჯეტი და ტენდერის პირობები გამოქვეყნდება <strong>ადგილობრივ თვითმმართველობის ვებ-გვერდზე</strong>.</p>
<p>ადმინისტრაცია მოსახლეობას მოუწოდებს, მიიღონ მონაწილეობა საზოგადოებრივ განხილვაში.</p>`,
        summary:      'გზების, სასმელი წყლისა და ტურისტული ინფრასტრუქტურის განვითარება — სოფელ უჯარმის 2024 წლის პრიორიტეტული სამოქმედო გეგმა.',
        published_at: new Date('2024-03-10'),
      },
    ];

    for (const art of articles) {
      await conn.execute(
        `INSERT INTO news
           (category_id, title, slug, content, excerpt, summary,
            featured_image, is_featured, is_published, published_at)
         VALUES (?, ?, ?, ?, ?, ?, NULL, 0, 1, ?)`,
        [
          art.category_id,
          art.title,
          art.slug,
          art.content,
          art.summary,
          art.summary,
          art.published_at,
        ]
      );
    }
    log('created', `Seed: ${articles.length} Georgian news articles inserted`);
  } else {
    log('skip', 'Seed: news — already populated');
  }

  // ── Attractions (Georgian, 6 real entries) ───
  if (await isEmpty(conn, 'attractions')) {
    const attractions = [
      {
        name:        'უჯარმის ციხე-სიმაგრე',
        slug:        'ujarmas-tsikhe-simagre',
        description: 'უჯარმის ციხე-სიმაგრე — ადრეული შუა საუკუნეების ერთ-ერთი ყველაზე მნიშვნელოვანი სამეფო გამაგრება სამხრეთ კავკასიაში. III–IV საუკუნეებიდან ათვლილი ისტორია, V საუკუნეში ვახტანგ გორგასლის სამეფო რეზიდენციად ქცეული, ეს ციხე დღესაც ამაყად დგას იორის ნაპირის კლდოვან ბორცვზე. ნანგრევები მოიცავს სასახლის, ეკლესიის, სამხედრო კოშკებისა და გალავნების ნაშთებს. ციხის ბუნებრივი პოზიცია ხეობისა და მდინარის პანორამულ ხედს სთავაზობს ვიზიტორებს.',
        category:    'ისტორიული ძეგლი',
        is_featured: 1,
      },
      {
        name:        'ციხის ადრეული ქრისტიანული ეკლესია',
        slug:        'tsikhis-adruli-kristianuli-eklesia',
        description: 'უჯარმის ციხის ტერიტორიაზე შემორჩენილია ადრეული ქრისტიანული ეკლესიის ნანგრევები, რომლის ათვლა V–VI საუკუნეებს განეკუთვნება. ეკლესია იმ ეპოქის სიმბოლოა, სადაც ქრისტიანობა საქართველოს სახელმწიფო რელიგიად გამოცხადდა. მოჩუქურთმებული ქვები და კედლის ნაშთები ქართული ადრეული ეკლესიური არქიტექტურის იშვიათ ნიმუშს წარმოადგენს. ჩვეულებრივი ვიზიტი ადგილობრივი გიდის ახსნა-განმარტებით ამ ადგილს განსაკუთრებულ სიღრმეს მატებს.',
        category:    'რელიგიური ძეგლი',
        is_featured: 1,
      },
      {
        name:        'იორის ხეობის პანორამა',
        slug:        'ioris-kheobis-panorama',
        description: 'იორის მდინარის ხეობა, რომლის მარჯვენა ნაპირზეც უჯარმა მდებარეობს, კახეთის ერთ-ერთი ყველაზე მიმზიდველი ბუნებრივი ლანდშაფტია. ციხის ბორცვიდან გასაოცარი ხედი იხსნება — ვაკე-ვენახები, მდინარის ვიწრო კალაპოტი, ახლომდებარე სოფლები და ჰორიზონტზე — კახეთის მთები. ფოტოგრაფებისთვის, ბუნებისმოყვარეთათვის და ისტორიის მოყვარეთათვის ეს ადგილი სავალდებულო გაჩერებაა. სეზონების ცვლა — განსაკუთრებით შემოდგომის ოქრო და გაზაფხულის მწვანე — ლანდშაფტს ყოველ ვიზიტზე ახალ სახეს ანიჭებს.',
        category:    'ბუნებრივი ლანდშაფტი',
        is_featured: 1,
      },
      {
        name:        'ვახტანგ გორგასლის ისტორიული ბილიკი',
        slug:        'vakhtang-gorgaslis-istoriuli-biliki',
        description: 'ვახტანგ გორგასლი — "ქართლის ცხოვრების" ლეგენდარული მეფე-მეომარი — ხშირად ამ გზებზე ლაშქრობდა. ამ ტრადიციის გახსენება მოვახდინეთ ადგილობრივი ისტორიული ბილიკის სახით, რომელიც ციხის ძირიდან დაიწყება, კლდის ნიჟარებს გავს და ხეობის ზემო ნაწილამდე ადის. ბილიკი ორ-სამ საათიანია, ადვილი სიარულის მოყვარეებისთვის ხელმისაწვდომი, ხოლო მთელი გზა სრულდება სოფლის ადგილობრივი ისტორიის ნარატივით. გამოცდილი ადგილობრივი გიდის ხელმძღვანელობით ეს ბილიკი ნამდვილ ისტორიულ მოგზაურობად იქცევა.',
        category:    'ტურისტული მარშრუტი',
        is_featured: 0,
      },
      {
        name:        'კახური ვენახები და ღვინის კულტურა',
        slug:        'kakhuri-venakhebi-da-ghvinis-kultura',
        description: 'კახეთი — მსოფლიოს უძველეს ღვინის კულტურათა სამშობლო — უჯარმის მიმდებარე ტერიტორიაზეც ამ ტრადიციას ინარჩუნებს. ადგილობრივი ოჯახების ვენახები, სადაც ათწლეულების განმავლობაში ერთი და იგივე ვაზის ჯიშები გაშენებულია, ნახვა ღირს ნებისმიერ სეზონზე. რთველი — სექტემბერ-ოქტომბერში — კახური კალენდრის ყველაზე სიხარულიანი მოვლენაა, სადაც ვიზიტორებსაც ამ ტრადიციაში მონაწილეობა შეუძლიათ. ქვევრის ღვინო, ადგილობრივი ჭაჭა და სამზარეულო — ეს გამოცდილება კახეთის სულის ნამდვილ ცოდნას გიქმნის.',
        category:    'სოფლის კულტურა',
        is_featured: 0,
      },
      {
        name:        'უჯარმის ძველი სასაფლაო',
        slug:        'ujarmas-dzveli-sasaplao',
        description: 'სოფლის ძველ სასაფლაოზე შემორჩენილია XVIII–XIX საუკუნეების ქვის ჯვრები და სამარხები, რომლებიც ქართული ეპიგრაფიკული კულტურის საინტერესო ნიმუშებს წარმოადგენს. ეს ადგილი ადგილობრივი ისტორიისა და სოფლის ოჯახური ტრადიციების კვლევის ნამდვილ წყაროს ქმნის. ისტორიკოსებისა და ეთნოგრაფებისთვის ეს პატარა, ხელუხლებელი სასაფლაო გაჩუმებული, მაგრამ ღირებული ისტორიული ანარჩევია. ვიზიტი შესაძლებელია სრულ პატივისცემაში.',
        category:    'ისტორიული ადგილი',
        is_featured: 0,
      },
    ];

    for (const attr of attractions) {
      await conn.execute(
        `INSERT INTO attractions
           (name, slug, description, category, is_featured, is_published)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [attr.name, attr.slug, attr.description, attr.category, attr.is_featured]
      );
    }
    log('created', `Seed: ${attractions.length} Georgian attractions inserted`);
  } else {
    log('skip', 'Seed: attractions — already populated');
  }

  // ── Gallery Categories (Georgian) ───────────
  if (await isEmpty(conn, 'gallery_categories')) {
    const galCats = [
      ['ლანდშაფტები',    'landscapes'],
      ['სოფლის ცხოვრება', 'village-life'],
      ['არქიტექტურა',    'architecture'],
      ['სეზონები',       'seasons'],
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
      [galCatId, 'უჯარმის პანორამა', 'placeholder-landscape.jpg']
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

    // ── Step 2b: Column Migrations ────────────────
    // Adds columns that were introduced after the initial schema.
    // Each ALTER is wrapped in a check so re-runs are safe.
    console.log('  ├─ Migrations ───────────────────────────────');
    await ensureMigrations(conn);

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
