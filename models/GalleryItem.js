/**
 * models/GalleryItem.js — Gallery Image Model
 * =============================================
 * Data access layer for the `gallery` table.
 */

import pool from '../config/db.js';

const GalleryItem = {
  /**
   * Retrieve all gallery items, optionally filtered by category.
   * @param {string|null} category
   * @returns {Promise<Array>}
   */
  async findAll(category = null) {
    if (category) {
      const [rows] = await pool.execute(
        `SELECT id, title, image, category, created_at
           FROM gallery
          WHERE category = ?
          ORDER BY created_at DESC`,
        [category]
      );
      return rows;
    }

    const [rows] = await pool.execute(
      `SELECT id, title, image, category, created_at
         FROM gallery
        ORDER BY created_at DESC`
    );
    return rows;
  },

  /**
   * Retrieve the most recent N gallery items for the homepage preview.
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  async findRecent(limit = 8) {
    const [rows] = await pool.execute(
      `SELECT id, title, image, category
         FROM gallery
        ORDER BY created_at DESC
        LIMIT ?`,
      [limit]
    );
    return rows;
  },

  /**
   * Retrieve all distinct category names.
   * @returns {Promise<string[]>}
   */
  async getCategories() {
    const [rows] = await pool.execute(
      'SELECT DISTINCT category FROM gallery ORDER BY category ASC'
    );
    return rows.map((row) => row.category);
  },
};

export default GalleryItem;
