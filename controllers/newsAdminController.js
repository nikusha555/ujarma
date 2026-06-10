/**
 * controllers/newsAdminController.js — Admin News CRUD
 * ======================================================
 * Handles all admin-side create / read / update / delete
 * operations for news articles.
 *
 * All routes are protected by requireAdmin (set in routes/admin.js).
 * All labels use Georgian.
 */

import fs      from 'fs';
import path    from 'path';
import { fileURLToPath } from 'url';

import News       from '../models/News.js';
import pool       from '../config/db.js';
import { slugify } from '../utils/slugify.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// Path to the news images upload folder
const NEWS_UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'news');

// ─────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────

/** Remove an image file from disk (silently ignores missing files). */
const unlinkImage = (filename) => {
  if (!filename) return;
  const full = path.join(NEWS_UPLOAD_DIR, filename);
  fs.unlink(full, () => {}); // fire-and-forget
};

/** Fetch all categories for form selects. */
const getCategories = async () => {
  const [rows] = await pool.execute(
    'SELECT id, name FROM categories ORDER BY name ASC'
  );
  return rows;
};

/**
 * Generate a unique slug from a title, appending a counter if needed.
 * @param {string}      title
 * @param {number|null} excludeId  — ID of the article being edited (skip self)
 */
const uniqueSlug = async (title, excludeId = null) => {
  let base = slugify(title);
  if (!base) base = `article-${Date.now()}`;

  let candidate = base;
  let counter   = 1;
  while (await News.slugExists(candidate, excludeId)) {
    candidate = `${base}-${counter}`;
    counter += 1;
  }
  return candidate;
};

// ─────────────────────────────────────────────
// LIST
// ─────────────────────────────────────────────

/**
 * GET /admin/news
 * Paginated, searchable, filterable news article list.
 */
export const getAdminNewsList = async (req, res, next) => {
  try {
    const page       = Math.max(1, parseInt(req.query.page       || '1',  10));
    const search     = req.query.search     || '';
    const categoryId = req.query.category   || '';

    const [{ rows, total }, categories] = await Promise.all([
      News.adminFindAll({ page, perPage: 15, search, categoryId }),
      getCategories(),
    ]);

    const totalPages = Math.ceil(total / 15);

    res.render('admin/news', {
      layout:      'layouts/admin',
      title:       'სიახლეების მართვა — უჯარმა ადმინი',
      articles:    rows,
      categories,
      total,
      page,
      totalPages,
      search,
      categoryId,
      flash:       req.query.flash || null,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────

/**
 * GET /admin/news/create
 * Renders the new-article form.
 */
export const getAdminNewsCreate = async (req, res, next) => {
  try {
    const categories = await getCategories();

    res.render('admin/news-create', {
      layout:     'layouts/admin',
      title:      'სტატიის დამატება — უჯარმა ადმინი',
      categories,
      formData:   {},
      errors:     [],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /admin/news/create
 * Validates and persists a new article. Handles image upload.
 */
export const postAdminNewsCreate = async (req, res, next) => {
  // If Multer threw a file-size error it lands here as req.fileError
  const uploadError = req.fileError || null;

  try {
    const {
      title,
      category_id,
      content,
      summary,
      is_featured,
      is_published,
      published_at,
    } = req.body;

    // ── Validation ─────────────────────────────
    const errors = [];
    if (uploadError)        errors.push(uploadError);
    if (!title?.trim())     errors.push('სათაური სავალდებულოა.');
    if (!content?.trim())   errors.push('კონტენტი სავალდებულოა.');

    const categories = await getCategories();

    if (errors.length > 0) {
      // Remove any uploaded file on validation failure
      if (req.file) unlinkImage(req.file.filename);
      return res.status(400).render('admin/news-create', {
        layout: 'layouts/admin',
        title:  'სტატიის დამატება — უჯარმა ადმინი',
        categories,
        formData: req.body,
        errors,
      });
    }

    // ── Slug ────────────────────────────────────
    const slug = await uniqueSlug(title.trim());

    // ── Persist ─────────────────────────────────
    await News.create({
      categoryId:   category_id   || null,
      title:        title.trim(),
      slug,
      content:      content.trim(),
      excerpt:      summary?.trim() || null,
      summary:      summary?.trim() || null,
      image:        req.file ? req.file.filename : null,
      featuredImage: req.file ? req.file.filename : null,
      isFeatured:   is_featured  === 'on',
      isPublished:  is_published === 'on',
      publishedAt:  published_at || new Date(),
    });

    res.redirect('/admin/news?flash=created');
  } catch (err) {
    if (req.file) unlinkImage(req.file.filename);
    next(err);
  }
};

// ─────────────────────────────────────────────
// EDIT
// ─────────────────────────────────────────────

/**
 * GET /admin/news/:id/edit
 * Renders the edit form pre-populated with existing data.
 */
export const getAdminNewsEdit = async (req, res, next) => {
  try {
    const [article, categories] = await Promise.all([
      News.findById(parseInt(req.params.id, 10)),
      getCategories(),
    ]);

    if (!article) {
      const err  = new Error('სტატია ვერ მოიძებნა.');
      err.status = 404;
      return next(err);
    }

    res.render('admin/news-edit', {
      layout:     'layouts/admin',
      title:      'სტატიის რედაქტირება — უჯარმა ადმინი',
      categories,
      article,
      errors:     [],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /admin/news/:id/edit
 * Validates and saves edits. Replaces the image if a new file is uploaded.
 */
export const postAdminNewsEdit = async (req, res, next) => {
  const uploadError = req.fileError || null;
  const id = parseInt(req.params.id, 10);

  try {
    const existing = await News.findById(id);
    if (!existing) {
      if (req.file) unlinkImage(req.file.filename);
      const err  = new Error('სტატია ვერ მოიძებნა.');
      err.status = 404;
      return next(err);
    }

    const {
      title,
      category_id,
      content,
      summary,
      is_featured,
      is_published,
      published_at,
      remove_image,
    } = req.body;

    // ── Validation ─────────────────────────────
    const errors = [];
    if (uploadError)        errors.push(uploadError);
    if (!title?.trim())     errors.push('სათაური სავალდებულოა.');
    if (!content?.trim())   errors.push('კონტენტი სავალდებულოა.');

    const categories = await getCategories();

    if (errors.length > 0) {
      if (req.file) unlinkImage(req.file.filename);
      return res.status(400).render('admin/news-edit', {
        layout:  'layouts/admin',
        title:   'სტატიის რედაქტირება — უჯარმა ადმინი',
        categories,
        article: { ...existing, ...req.body, id },
        errors,
      });
    }

    // ── Determine new slug (skip if title unchanged) ─
    let slug = existing.slug;
    if (title.trim() !== existing.title) {
      slug = await uniqueSlug(title.trim(), id);
    }

    // ── Image handling ──────────────────────────
    let newImage = existing.featured_image || existing.image;

    if (req.file) {
      // New file uploaded — delete the old one
      unlinkImage(existing.featured_image || existing.image);
      newImage = req.file.filename;
    } else if (remove_image === 'on') {
      // Admin ticked "remove image"
      unlinkImage(existing.featured_image || existing.image);
      newImage = null;
    }

    // ── Persist ─────────────────────────────────
    await News.update(id, {
      categoryId:   category_id   || null,
      title:        title.trim(),
      slug,
      content:      content.trim(),
      excerpt:      summary?.trim() || null,
      summary:      summary?.trim() || null,
      image:        newImage,
      featuredImage: newImage,
      isFeatured:   is_featured  === 'on',
      isPublished:  is_published === 'on',
      publishedAt:  published_at || existing.published_at,
    });

    res.redirect('/admin/news?flash=updated');
  } catch (err) {
    if (req.file) unlinkImage(req.file.filename);
    next(err);
  }
};

// ─────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────

/**
 * POST /admin/news/:id/delete
 * Deletes the article and its image from disk.
 * Uses POST (not DELETE) so it works from a plain HTML form.
 */
export const postAdminNewsDelete = async (req, res, next) => {
  try {
    const id       = parseInt(req.params.id, 10);
    const filename = await News.delete(id);

    // Remove the image file from disk (if any)
    unlinkImage(filename);

    res.redirect('/admin/news?flash=deleted');
  } catch (err) {
    next(err);
  }
};
