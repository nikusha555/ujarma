/**
 * models/Attraction.js — Tourist Attraction Model
 * =================================================
 * Data access layer for the `attractions` table.
 */

import pool from '../config/db.js';

const Attraction = {
  /**
   * Retrieve all published attractions.
   * Featured items are sorted first.
   * @returns {Promise<Array>}
   */
  async findAll() {
    const [rows] = await pool.execute(
      `SELECT id, name, slug, description, image, category, is_featured, created_at
         FROM attractions
        WHERE is_published = 1
        ORDER BY is_featured DESC, name ASC`
    );
    return rows;
  },

  /**
   * Retrieve featured attractions for the homepage preview.
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  async findFeatured(limit = 3) {
    const [rows] = await pool.execute(
      `SELECT id, name, slug, description, image, category
         FROM attractions
        WHERE is_published = 1 AND is_featured = 1
        ORDER BY created_at DESC
        LIMIT ?`,
      [limit]
    );
    return rows;
  },

  /**
   * Find a single published attraction by its URL slug.
   * @param {string} slug
   * @returns {Promise<Object|null>}
   */
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
};

export default Attraction;
