/**
 * models/GalleryItem.js — Gallery Image Model (Full CRUD)
 * =========================================================
 * Uses gallery_items table (joined with gallery_categories).
 * LIMIT embedded as literal — pool.execute() rejects LIMIT ?.
 */

import pool from '../config/db.js';

const GalleryItem = {

  // ── Public ──────────────────────────────────────────────

  /** All gallery items, optional category slug filter. */
  async findAll(categorySlug = null) {
    if (categorySlug) {
      const [rows] = await pool.execute(
        `SELECT gi.id, gi.title, gi.image, gc.name AS category, gc.slug AS category_slug, gi.created_at
           FROM gallery_items gi
           LEFT JOIN gallery_categories gc ON gc.id = gi.category_id
          WHERE gc.slug = ?
          ORDER BY gi.created_at DESC`,
        [categorySlug]
      );
      return rows;
    }
    const [rows] = await pool.execute(
      `SELECT gi.id, gi.title, gi.image, gc.name AS category, gc.slug AS category_slug, gi.created_at
         FROM gallery_items gi
         LEFT JOIN gallery_categories gc ON gc.id = gi.category_id
        ORDER BY gi.created_at DESC`
    );
    return rows;
  },

  /** Recent N items for homepage preview. */
  async findRecent(limit = 8) {
    const n = parseInt(limit, 10) || 8;
    const [rows] = await pool.execute(
      `SELECT gi.id, gi.title, gi.image, gc.name AS category, gc.slug AS category_slug
         FROM gallery_items gi
         LEFT JOIN gallery_categories gc ON gc.id = gi.category_id
        ORDER BY gi.created_at DESC
        LIMIT ${n}`,
      []
    );
    return rows;
  },

  /** All gallery_categories for filter bar and selects. */
  async getCategories() {
    const [rows] = await pool.execute(
      'SELECT id, name, slug FROM gallery_categories ORDER BY name ASC'
    );
    return rows;
  },

  // ── Admin ────────────────────────────────────────────────

  /** Paginated admin list with search. */
  async adminFindAll({ page = 1, perPage = 20, search = '', categoryId = '' } = {}) {
    const offset    = (page - 1) * perPage;
    const safeLimit = parseInt(perPage, 10);
    const safeOff   = parseInt(offset, 10);

    const conditions = [];
    const params     = [];
    if (search.trim()) {
      conditions.push('gi.title LIKE ?');
      params.push(`%${search.trim()}%`);
    }
    if (categoryId) {
      conditions.push('gi.category_id = ?');
      params.push(categoryId);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM gallery_items gi ${where}`, params
    );
    const total = countRows[0].total;

    const [rows] = await pool.execute(
      `SELECT gi.id, gi.title, gi.image, gi.category_id,
              gc.name AS category_name, gc.slug AS category_slug,
              gi.created_at
         FROM gallery_items gi
         LEFT JOIN gallery_categories gc ON gc.id = gi.category_id
         ${where}
         ORDER BY gi.created_at DESC
         LIMIT ${safeLimit} OFFSET ${safeOff}`,
      params
    );
    return { rows, total };
  },

  /** Single item by ID. */
  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT gi.id, gi.title, gi.image, gi.category_id,
              gc.name AS category_name, gc.slug AS category_slug
         FROM gallery_items gi
         LEFT JOIN gallery_categories gc ON gc.id = gi.category_id
        WHERE gi.id = ? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  /** Insert new gallery item. */
  async create({ title, image, categoryId }) {
    const [result] = await pool.execute(
      'INSERT INTO gallery_items (title, image, category_id) VALUES (?, ?, ?)',
      [title, image, categoryId || null]
    );
    return result.insertId;
  },

  /** Update title / category (image update handled in controller). */
  async update(id, { title, categoryId, image }) {
    await pool.execute(
      'UPDATE gallery_items SET title=?, category_id=?, image=? WHERE id=?',
      [title, categoryId || null, image, id]
    );
  },

  /** Delete and return filename for disk cleanup. */
  async delete(id) {
    const item = await GalleryItem.findById(id);
    if (!item) return null;
    await pool.execute('DELETE FROM gallery_items WHERE id = ?', [id]);
    return item.image || null;
  },
};

export default GalleryItem;

