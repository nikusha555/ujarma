/**
 * models/Attraction.js — Tourist Attraction Model (Full CRUD)
 * ============================================================
 * LIMIT/OFFSET embedded as safe integer literals — pool.execute()
 * rejects LIMIT ? via prepared-statement protocol (mysqld_stmt_execute).
 */

import pool from '../config/db.js';

const Attraction = {

  // ── Public ──────────────────────────────────────────────

  /** All published attractions — featured first, then alpha. */
  async findAll() {
    const [rows] = await pool.execute(
      `SELECT id, name, slug, description, image, category, is_featured, created_at
         FROM attractions
        WHERE is_published = 1
        ORDER BY is_featured DESC, name ASC`
    );
    return rows;
  },

  /** Featured attractions for homepage preview. */
  async findFeatured(limit = 3) {
    const n = parseInt(limit, 10) || 3;
    const [rows] = await pool.execute(
      `SELECT id, name, slug, description, image, category
         FROM attractions
        WHERE is_published = 1 AND is_featured = 1
        ORDER BY created_at DESC
        LIMIT ${n}`,
      []
    );
    return rows;
  },

  /** Single published attraction by slug. */
  async findBySlug(slug) {
    const [rows] = await pool.execute(
      `SELECT id, name, slug, description, image, category, is_featured, created_at
         FROM attractions
        WHERE slug = ? AND is_published = 1
        LIMIT 1`,
      [slug]
    );
    return rows[0] || null;
  },

  /** Related attractions (same category, exclude self). */
  async findRelated(category, excludeId, limit = 3) {
    const n = parseInt(limit, 10) || 3;
    if (!category) return [];
    const [rows] = await pool.execute(
      `SELECT id, name, slug, description, image, category
         FROM attractions
        WHERE is_published = 1
          AND is_featured = 1
          AND category = ?
          AND id != ?
        ORDER BY created_at DESC
        LIMIT ${n}`,
      [category, excludeId]
    );
    return rows;
  },

  /** All distinct category names (public). */
  async getCategories() {
    const [rows] = await pool.execute(
      `SELECT DISTINCT category FROM attractions
        WHERE is_published = 1 AND category IS NOT NULL
        ORDER BY category ASC`
    );
    return rows.map((r) => r.category);
  },

  // ── Admin ────────────────────────────────────────────────

  /** Paginated admin list with optional search / category filter. */
  async adminFindAll({ page = 1, perPage = 15, search = '', category = '' } = {}) {
    const offset    = (page - 1) * perPage;
    const safeLimit = parseInt(perPage, 10);
    const safeOff   = parseInt(offset, 10);

    const conditions = [];
    const params     = [];
    if (search.trim()) {
      conditions.push('(name LIKE ? OR description LIKE ?)');
      const like = `%${search.trim()}%`;
      params.push(like, like);
    }
    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM attractions ${where}`, params
    );
    const total = countRows[0].total;

    const [rows] = await pool.execute(
      `SELECT id, name, slug, image, category, is_featured, is_published, created_at
         FROM attractions
         ${where}
         ORDER BY created_at DESC
         LIMIT ${safeLimit} OFFSET ${safeOff}`,
      params
    );
    return { rows, total };
  },

  /** Single attraction by ID for edit form. */
  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT id, name, slug, description, image, category, is_featured, is_published, created_at
         FROM attractions WHERE id = ? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  /** Check slug uniqueness (optionally excluding own id). */
  async slugExists(slug, excludeId = null) {
    if (excludeId) {
      const [r] = await pool.execute(
        'SELECT 1 FROM attractions WHERE slug = ? AND id != ? LIMIT 1',
        [slug, excludeId]
      );
      return r.length > 0;
    }
    const [r] = await pool.execute(
      'SELECT 1 FROM attractions WHERE slug = ? LIMIT 1', [slug]
    );
    return r.length > 0;
  },

  /** Insert new attraction. Returns insertId. */
  async create({ name, slug, description, image, category, isFeatured, isPublished }) {
    const [result] = await pool.execute(
      `INSERT INTO attractions (name, slug, description, image, category, is_featured, is_published)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, slug, description || '', image || null, category || null,
       isFeatured ? 1 : 0, isPublished ? 1 : 0]
    );
    return result.insertId;
  },

  /** Update attraction by id. */
  async update(id, { name, slug, description, image, category, isFeatured, isPublished }) {
    await pool.execute(
      `UPDATE attractions SET name=?, slug=?, description=?, image=?,
          category=?, is_featured=?, is_published=? WHERE id=?`,
      [name, slug, description || '', image || null, category || null,
       isFeatured ? 1 : 0, isPublished ? 1 : 0, id]
    );
  },

  /** Delete and return the image filename for disk cleanup. */
  async delete(id) {
    const rec = await Attraction.findById(id);
    if (!rec) return null;
    await pool.execute('DELETE FROM attractions WHERE id = ?', [id]);
    return rec.image || null;
  },
};

export default Attraction;

