/**
 * models/News.js — News Article Model (Full CRUD)
 * =================================================
 * Data access layer for the `news` table.
 * All methods return plain objects from mysql2/promise.
 * Uses conn.execute() (prepared statements) for all DML.
 */

import pool from '../config/db.js';

const News = {

  // ─────────────────────────────────────────────
  // Public site queries
  // ─────────────────────────────────────────────

  /** All published articles, newest first (public listing). */
  async findAll(limit = 20) {
    // LIMIT must be a literal — pool.execute() binary protocol rejects
    // LIMIT/OFFSET as bound `?` parameters (mysqld_stmt_execute error).
    const safeLimit = parseInt(limit, 10) || 20;
    const [rows] = await pool.execute(
      `SELECT n.id, n.title, n.slug, n.excerpt, n.summary, n.image,
              n.featured_image, n.is_featured, n.published_at, n.created_at,
              c.name AS category_name
         FROM news n
         LEFT JOIN categories c ON c.id = n.category_id
        WHERE n.is_published = 1
        ORDER BY n.published_at DESC
        LIMIT ${safeLimit}`,
      []
    );
    return rows;
  },

  /** N most recent published articles for the homepage preview. */
  async findLatest(limit = 3) {
    // LIMIT must be a literal — pool.execute() binary protocol rejects bound LIMIT params.
    const safeLimit = parseInt(limit, 10) || 3;
    const [rows] = await pool.execute(
      `SELECT n.id, n.title, n.slug, n.excerpt, n.summary,
              n.image, n.featured_image, n.is_featured, n.published_at,
              c.name AS category_name
         FROM news n
         LEFT JOIN categories c ON c.id = n.category_id
        WHERE n.is_published = 1
        ORDER BY n.published_at DESC
        LIMIT ${safeLimit}`,
      []
    );
    return rows;
  },

  /** Single published article by URL slug (public detail page). */
  async findBySlug(slug) {
    const [rows] = await pool.execute(
      `SELECT n.id, n.title, n.slug, n.content, n.excerpt, n.summary,
              n.image, n.featured_image, n.is_featured, n.published_at, n.created_at,
              c.name AS category_name
         FROM news n
         LEFT JOIN categories c ON c.id = n.category_id
        WHERE n.slug = ? AND n.is_published = 1
        LIMIT 1`,
      [slug]
    );
    return rows[0] || null;
  },

  /** Total count of published articles (used in admin dashboard stat). */
  async count() {
    const [rows] = await pool.execute(
      'SELECT COUNT(*) AS total FROM news WHERE is_published = 1'
    );
    return rows[0].total;
  },

  // ─────────────────────────────────────────────
  // Admin queries (all articles, not just published)
  // ─────────────────────────────────────────────

  /**
   * Paginated list of ALL articles for the admin table.
   * Supports keyword search and category filter.
   * @param {{ page, perPage, search, categoryId }} opts
   * @returns {{ rows, total }}
   */
  async adminFindAll({ page = 1, perPage = 15, search = '', categoryId = '' } = {}) {
    const offset = (page - 1) * perPage;

    // Build dynamic WHERE clauses
    const conditions = [];
    const params     = [];

    if (search.trim()) {
      conditions.push('(n.title LIKE ? OR n.excerpt LIKE ? OR n.summary LIKE ?)');
      const like = `%${search.trim()}%`;
      params.push(like, like, like);
    }
    if (categoryId) {
      conditions.push('n.category_id = ?');
      params.push(categoryId);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total for pagination
    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM news n ${where}`,
      params
    );
    const total = countRows[0].total;

    // Paginated rows
    // NOTE: LIMIT and OFFSET must be integer literals in the SQL string —
    // mysql2's binary prepared-statement protocol (pool.execute) rejects
    // them as bound parameters (causes "Incorrect arguments to mysqld_stmt_execute").
    // Both values are guaranteed safe integers: perPage is always 15 (literal),
    // offset is always the result of (parseInt page − 1) * 15.
    const safeLimit  = parseInt(perPage, 10);
    const safeOffset = parseInt(offset,  10);

    const [rows] = await pool.execute(
      `SELECT n.id, n.title, n.slug, n.image, n.featured_image,
              n.is_published, n.is_featured, n.published_at, n.created_at,
              c.name AS category_name
         FROM news n
         LEFT JOIN categories c ON c.id = n.category_id
         ${where}
         ORDER BY n.created_at DESC
         LIMIT ${safeLimit} OFFSET ${safeOffset}`,
      params
    );

    return { rows, total };
  },

  /** Single article by ID for the admin edit form (any publish state). */
  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT n.id, n.category_id, n.title, n.slug, n.content,
              n.excerpt, n.summary, n.image, n.featured_image,
              n.is_published, n.is_featured, n.published_at,
              n.created_at, n.updated_at
         FROM news n
        WHERE n.id = ?
        LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  /**
   * Check whether a slug is already in use (optionally excluding one ID).
   * @param {string}      slug
   * @param {number|null} excludeId
   */
  async slugExists(slug, excludeId = null) {
    if (excludeId) {
      const [rows] = await pool.execute(
        'SELECT 1 FROM news WHERE slug = ? AND id != ? LIMIT 1',
        [slug, excludeId]
      );
      return rows.length > 0;
    }
    const [rows] = await pool.execute(
      'SELECT 1 FROM news WHERE slug = ? LIMIT 1',
      [slug]
    );
    return rows.length > 0;
  },

  /**
   * Create a new article. Returns the inserted row ID.
   * @param {Object} data
   */
  async create({ categoryId, title, slug, content, excerpt, summary, image,
                 featuredImage, isFeatured, isPublished, publishedAt }) {
    const [result] = await pool.execute(
      `INSERT INTO news
         (category_id, title, slug, content, excerpt, summary,
          image, featured_image, is_featured, is_published, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        categoryId  || null,
        title,
        slug,
        content,
        excerpt     || null,
        summary     || null,
        image       || null,
        featuredImage || null,
        isFeatured  ? 1 : 0,
        isPublished ? 1 : 0,
        publishedAt || new Date(),
      ]
    );
    return result.insertId;
  },

  /**
   * Update an existing article by ID.
   * @param {number} id
   * @param {Object} data
   */
  async update(id, { categoryId, title, slug, content, excerpt, summary,
                     image, featuredImage, isFeatured, isPublished, publishedAt }) {
    await pool.execute(
      `UPDATE news SET
         category_id    = ?,
         title          = ?,
         slug           = ?,
         content        = ?,
         excerpt        = ?,
         summary        = ?,
         image          = ?,
         featured_image = ?,
         is_featured    = ?,
         is_published   = ?,
         published_at   = ?
       WHERE id = ?`,
      [
        categoryId    || null,
        title,
        slug,
        content,
        excerpt       || null,
        summary       || null,
        image         || null,
        featuredImage || null,
        isFeatured    ? 1 : 0,
        isPublished   ? 1 : 0,
        publishedAt   || new Date(),
        id,
      ]
    );
  },

  /** Delete an article by ID. Returns the filename stored in `featured_image` (or `image`) so the caller can remove it from disk. */
  async delete(id) {
    const article = await News.findById(id);
    if (!article) return null;

    await pool.execute('DELETE FROM news WHERE id = ?', [id]);
    return article.featured_image || article.image || null;
  },
};

export default News;

