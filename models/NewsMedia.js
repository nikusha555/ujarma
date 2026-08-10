/**
 * models/NewsMedia.js — News Article Media (images + video) Model
 * ==================================================================
 * Data access layer for the `news_media` table — the multi-image /
 * video gallery attached to a single news article.
 *
 * One row = one uploaded file. `is_cover` marks the single primary
 * image shown on the public site and in the admin list (kept in sync
 * with the legacy `news.image` / `news.featured_image` columns by
 * newsAdminController.js, not by this model).
 */

import pool from '../config/db.js';

const NewsMedia = {

  /** All media for one article, ordered for display (cover-agnostic — sort_order only). */
  async findByNewsId(newsId) {
    const [rows] = await pool.execute(
      `SELECT id, news_id, type, file, is_cover, sort_order, created_at
         FROM news_media
        WHERE news_id = ?
        ORDER BY sort_order ASC, id ASC`,
      [newsId]
    );
    return rows;
  },

  /** The current cover row for an article, or null if it has no media. */
  async findCover(newsId) {
    const [rows] = await pool.execute(
      `SELECT id, file, type
         FROM news_media
        WHERE news_id = ? AND is_cover = 1
        LIMIT 1`,
      [newsId]
    );
    return rows[0] || null;
  },

  /** Highest sort_order currently used by an article (for appending new uploads). */
  async maxSortOrder(newsId) {
    const [rows] = await pool.execute(
      `SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM news_media WHERE news_id = ?`,
      [newsId]
    );
    return rows[0].maxOrder;
  },

  /**
   * Insert one media row.
   * @returns {number} inserted id
   */
  async create({ newsId, type, file, isCover = false, sortOrder = 0 }) {
    const [result] = await pool.execute(
      `INSERT INTO news_media (news_id, type, file, is_cover, sort_order)
       VALUES (?, ?, ?, ?, ?)`,
      [newsId, type, file, isCover ? 1 : 0, sortOrder]
    );
    return result.insertId;
  },

  /**
   * Fetch a single media row, but only if it belongs to the given
   * news article — used before delete/cover operations so one admin
   * request can never touch another article's media (IDOR guard).
   */
  async findOwned(id, newsId) {
    const [rows] = await pool.execute(
      `SELECT id, news_id, type, file, is_cover, sort_order
         FROM news_media
        WHERE id = ? AND news_id = ?
        LIMIT 1`,
      [id, newsId]
    );
    return rows[0] || null;
  },

  /** Delete one media row. Returns the filename so the caller can unlink it from disk. */
  async deleteById(id, newsId) {
    const row = await NewsMedia.findOwned(id, newsId);
    if (!row) return null;
    await pool.execute('DELETE FROM news_media WHERE id = ?', [id]);
    return row.file;
  },

  /** Clear is_cover on every media row for an article. */
  async clearCover(newsId) {
    await pool.execute('UPDATE news_media SET is_cover = 0 WHERE news_id = ?', [newsId]);
  },

  /** Set exactly one media row as cover (clearing any previous cover first). */
  async setCover(newsId, mediaId) {
    await NewsMedia.clearCover(newsId);
    await pool.execute(
      'UPDATE news_media SET is_cover = 1 WHERE id = ? AND news_id = ?',
      [mediaId, newsId]
    );
  },

  /**
   * Persist a new display order for an article's media.
   * @param {number}   newsId
   * @param {number[]} orderedIds  media IDs in the desired order
   */
  async reorder(newsId, orderedIds) {
    await Promise.all(
      orderedIds.map((id, index) =>
        pool.execute(
          'UPDATE news_media SET sort_order = ? WHERE id = ? AND news_id = ?',
          [index, id, newsId]
        )
      )
    );
  },

  /** All media filenames for an article (used to unlink files before/at article delete). */
  async allFiles(newsId) {
    const [rows] = await pool.execute(
      'SELECT file FROM news_media WHERE news_id = ?',
      [newsId]
    );
    return rows.map((r) => r.file);
  },
};

export default NewsMedia;
