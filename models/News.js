/**
 * models/News.js — News Article Model
 * =====================================
 * Data access layer for the `news` table.
 * All methods return plain objects from MySQL2.
 */

import pool from '../config/db.js';

const News = {
  /**
   * Retrieve all published news articles, newest first.
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  async findAll(limit = 20) {
    const [rows] = await pool.execute(
      `SELECT id, title, slug, excerpt, image, published_at, created_at
         FROM news
        WHERE is_published = 1
        ORDER BY published_at DESC
        LIMIT ?`,
      [limit]
    );
    return rows;
  },

  /**
   * Retrieve the N most recent published articles (for homepage preview).
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  async findLatest(limit = 3) {
    const [rows] = await pool.execute(
      `SELECT id, title, slug, excerpt, image, published_at
         FROM news
        WHERE is_published = 1
        ORDER BY published_at DESC
        LIMIT ?`,
      [limit]
    );
    return rows;
  },

  /**
   * Find a single published article by its URL slug.
   * @param {string} slug
   * @returns {Promise<Object|null>}
   */
  async findBySlug(slug) {
    const [rows] = await pool.execute(
      `SELECT id, title, slug, content, excerpt, image, published_at, created_at
         FROM news
        WHERE slug = ? AND is_published = 1
        LIMIT 1`,
      [slug]
    );
    return rows[0] || null;
  },

  /**
   * Return the total count of published articles.
   * @returns {Promise<number>}
   */
  async count() {
    const [rows] = await pool.execute(
      'SELECT COUNT(*) AS total FROM news WHERE is_published = 1'
    );
    return rows[0].total;
  },
};

export default News;
