/**
 * controllers/newsAdminController.js — Admin News CRUD
 * ======================================================
 * Handles all admin-side create / read / update / delete
 * operations for news articles, including the multi-image /
 * video "მედია" (Media) manager.
 *
 * Media architecture
 * -------------------
 * Each article can have any number of images + videos, stored as rows
 * in `news_media` (see models/NewsMedia.js). Exactly one image may be
 * marked `is_cover`. The legacy `news.image` / `news.featured_image`
 * columns are kept in sync with whichever row is currently the cover,
 * so every other part of the app (admin list thumbnail, public
 * listing/detail pages, homepage preview) keeps working unmodified —
 * they only ever read those two columns and know nothing about
 * news_media.
 *
 * All routes are protected by requireAdmin (set in routes/admin.js).
 * All labels use Georgian.
 */

import fs      from 'fs';
import path    from 'path';
import { fileURLToPath } from 'url';

import News       from '../models/News.js';
import NewsMedia  from '../models/NewsMedia.js';
import pool       from '../config/db.js';
import { slugify } from '../utils/slugify.js';
import {
  isImageMime, isVideoMime, MAX_IMAGE_SIZE, MAX_VIDEO_SIZE,
} from '../config/multerNewsMedia.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// Path to the news images/video upload folder
const NEWS_UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'news');

/**
 * Resolve the public URL for a news media file.
 * Multer stores files in uploads/news/ — the filename only is persisted in DB.
 * @param {string|null} filename
 */
const newsImageUrl = (filename) =>
  filename ? `/uploads/news/${filename}` : null;

// ─────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────

/** Remove a media file from disk (silently ignores missing files). */
const unlinkImage = (filename) => {
  if (!filename) return;
  const full = path.join(NEWS_UPLOAD_DIR, filename);
  fs.unlink(full, () => {}); // fire-and-forget
};

/** Remove every file in a Multer `req.files` array from disk. Used to clean up
 *  after a validation failure so a rejected submit never leaves orphan files. */
const unlinkUploadedFiles = (files) => {
  (files || []).forEach((f) => unlinkImage(f.filename));
};

/**
 * Re-check per-type size limits Multer itself can't express (it only
 * supports one ceiling for the whole field). Returns the first Georgian
 * error message found, or null if every file is within its own limit.
 * @param {Express.Multer.File[]} files
 */
const validateMediaFiles = (files) => {
  for (const file of files) {
    if (isImageMime(file.mimetype) && file.size > MAX_IMAGE_SIZE) {
      return `სურათი „${file.originalname}“ ძალიან დიდია (მაქს. 5 MB).`;
    }
    if (isVideoMime(file.mimetype) && file.size > MAX_VIDEO_SIZE) {
      return `ვიდეო „${file.originalname}“ ძალიან დიდია (მაქს. 40 MB).`;
    }
  }
  return null;
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

/** Keep the legacy cover columns in sync with the current news_media cover row. */
const syncLegacyCoverColumns = async (newsId, coverFilename) => {
  await pool.execute(
    'UPDATE news SET image = ?, featured_image = ? WHERE id = ?',
    [coverFilename, coverFilename, newsId]
  );
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
      newsImageUrl,
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
      newsImageUrl,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /admin/news/create
 * Validates and persists a new article, then its media (the article
 * must exist first — news_media.news_id is a required foreign key).
 */
export const postAdminNewsCreate = async (req, res, next) => {
  // If Multer threw an upload error it lands here as req.fileError
  const uploadError = req.fileError || null;
  const files        = req.files || [];

  try {
    const {
      title,
      category_id,
      content,
      summary,
      is_featured,
      is_published,
      published_at,
      cover_index,
    } = req.body;

    // ── Validation ─────────────────────────────
    const errors = [];
    if (uploadError)        errors.push(uploadError);
    if (!title?.trim())     errors.push('სათაური სავალდებულოა.');
    if (!content?.trim())   errors.push('კონტენტი სავალდებულოა.');
    const sizeError = validateMediaFiles(files);
    if (sizeError) errors.push(sizeError);

    const categories = await getCategories();

    if (errors.length > 0) {
      // Never leave orphan files on disk for a submission that failed.
      unlinkUploadedFiles(files);
      return res.status(400).render('admin/news-create', {
        layout: 'layouts/admin',
        title:  'სტატიის დამატება — უჯარმა ადმინი',
        categories,
        formData: req.body,
        errors,
        newsImageUrl,
      });
    }

    // ── Slug ────────────────────────────────────
    const slug = await uniqueSlug(title.trim());

    // ── Create the article first (media needs a real news_id) ──
    const newsId = await News.create({
      categoryId:   category_id   || null,
      title:        title.trim(),
      slug,
      content:      content.trim(),
      excerpt:      summary?.trim() || null,
      summary:      summary?.trim() || null,
      image:        null,
      featuredImage: null,
      isFeatured:   is_featured  === 'on',
      isPublished:  is_published === 'on',
      publishedAt:  published_at || new Date(),
    });

    // ── Persist uploaded media, if any ──────────
    if (files.length > 0) {
      const inserted = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const type = isVideoMime(file.mimetype) ? 'video' : 'image';
        const mediaId = await NewsMedia.create({
          newsId, type, file: file.filename, isCover: false, sortOrder: i,
        });
        inserted.push({ id: mediaId, type, file: file.filename });
      }

      // Cover: the admin's explicit choice (an index into THIS upload
      // batch) if it points at an image, otherwise the first image.
      const requestedIdx = parseInt(cover_index, 10);
      const coverEntry =
        (!Number.isNaN(requestedIdx) && inserted[requestedIdx]?.type === 'image' && inserted[requestedIdx]) ||
        inserted.find((m) => m.type === 'image') ||
        null;

      if (coverEntry) {
        await NewsMedia.setCover(newsId, coverEntry.id);
        await syncLegacyCoverColumns(newsId, coverEntry.file);
      }
    }

    res.redirect('/admin/news?flash=created');
  } catch (err) {
    unlinkUploadedFiles(files);
    next(err);
  }
};

// ─────────────────────────────────────────────
// EDIT
// ─────────────────────────────────────────────

/**
 * GET /admin/news/:id/edit
 * Renders the edit form pre-populated with existing data + media.
 */
export const getAdminNewsEdit = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [article, categories, media] = await Promise.all([
      News.findById(id),
      getCategories(),
      NewsMedia.findByNewsId(id),
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
      media,
      newsImageUrl,
      errors:     [],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /admin/news/:id/edit
 * Validates and saves edits: article fields, plus any combination of
 * newly uploaded media, deleted media, reordering, and cover change —
 * all committed together with the rest of the form (no separate
 * "upload" step, per the media manager's UX design).
 */
export const postAdminNewsEdit = async (req, res, next) => {
  const uploadError = req.fileError || null;
  const id    = parseInt(req.params.id, 10);
  const files = req.files || [];

  try {
    const existing = await News.findById(id);
    if (!existing) {
      unlinkUploadedFiles(files);
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
      delete_media_ids,
      media_order,
      cover_media_id,
    } = req.body;

    // ── Validation ─────────────────────────────
    const errors = [];
    if (uploadError)        errors.push(uploadError);
    if (!title?.trim())     errors.push('სათაური სავალდებულოა.');
    if (!content?.trim())   errors.push('კონტენტი სავალდებულოა.');
    const sizeError = validateMediaFiles(files);
    if (sizeError) errors.push(sizeError);

    const categories = await getCategories();

    if (errors.length > 0) {
      unlinkUploadedFiles(files);
      const media = await NewsMedia.findByNewsId(id);
      return res.status(400).render('admin/news-edit', {
        layout:  'layouts/admin',
        title:   'სტატიის რედაქტირება — უჯარმა ადმინი',
        categories,
        article: { ...existing, ...req.body, id },
        media,
        newsImageUrl,
        errors,
      });
    }

    // ── Determine new slug (skip if title unchanged) ─
    let slug = existing.slug;
    if (title.trim() !== existing.title) {
      slug = await uniqueSlug(title.trim(), id);
    }

    // ── Delete media the admin removed ──────────
    // NewsMedia.deleteById only deletes a row that actually belongs to
    // this news_id, so a tampered id list can never touch another
    // article's media.
    const deleteIds = (delete_media_ids || '')
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !Number.isNaN(n));
    for (const mediaId of deleteIds) {
      const filename = await NewsMedia.deleteById(mediaId, id);
      if (filename) unlinkImage(filename);
    }

    // ── Persist the admin's reorder of the remaining existing media ──
    const orderIds = (media_order || '')
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !Number.isNaN(n) && !deleteIds.includes(n));
    if (orderIds.length > 0) {
      await NewsMedia.reorder(id, orderIds);
    }

    // ── Insert newly uploaded media, appended after existing ────────
    const startOrder = (await NewsMedia.maxSortOrder(id)) + 1;
    const inserted = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const type = isVideoMime(file.mimetype) ? 'video' : 'image';
      const mediaId = await NewsMedia.create({
        newsId: id, type, file: file.filename, isCover: false, sortOrder: startOrder + i,
      });
      inserted.push({ id: mediaId, type, file: file.filename });
    }

    // ── Cover selection ──────────────────────────
    // cover_media_id is either an existing media row id, or "new:<index>"
    // referring to a file uploaded in THIS submission.
    let coverEntry = null;
    if (cover_media_id && cover_media_id.startsWith('new:')) {
      const idx = parseInt(cover_media_id.slice(4), 10);
      if (inserted[idx]?.type === 'image') coverEntry = inserted[idx];
    } else if (cover_media_id) {
      const requestedId = parseInt(cover_media_id, 10);
      const row = await NewsMedia.findOwned(requestedId, id);
      if (row && row.type === 'image') coverEntry = row;
    }
    if (!coverEntry) {
      // No explicit (valid) choice — keep the current cover if it's
      // still around, otherwise fall back to the first remaining image.
      const currentCover = await NewsMedia.findCover(id);
      if (currentCover) {
        coverEntry = currentCover;
      } else {
        const remaining = await NewsMedia.findByNewsId(id);
        coverEntry = remaining.find((m) => m.type === 'image')
          || inserted.find((m) => m.type === 'image')
          || null;
      }
    }
    if (coverEntry) {
      await NewsMedia.setCover(id, coverEntry.id);
    }
    const coverFile = coverEntry ? coverEntry.file : null;

    // ── Persist article fields + keep legacy cover columns in sync ──
    await News.update(id, {
      categoryId:   category_id   || null,
      title:        title.trim(),
      slug,
      content:      content.trim(),
      excerpt:      summary?.trim() || null,
      summary:      summary?.trim() || null,
      image:        coverFile,
      featuredImage: coverFile,
      isFeatured:   is_featured  === 'on',
      isPublished:  is_published === 'on',
      publishedAt:  published_at || existing.published_at,
    });

    res.redirect('/admin/news?flash=updated');
  } catch (err) {
    unlinkUploadedFiles(files);
    next(err);
  }
};

// ─────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────

/**
 * POST /admin/news/:id/delete
 * Deletes the article and every associated media file from disk.
 * Uses POST (not DELETE) so it works from a plain HTML form.
 */
export const postAdminNewsDelete = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);

    // Fetch every media filename BEFORE deleting — the DB rows disappear
    // automatically (news_media.news_id has ON DELETE CASCADE) but the
    // physical files do not, so we still need the list to unlink them.
    const mediaFiles     = await NewsMedia.allFiles(id);
    const legacyFilename = await News.delete(id);

    unlinkImage(legacyFilename);
    mediaFiles.forEach(unlinkImage);

    res.redirect('/admin/news?flash=deleted');
  } catch (err) {
    next(err);
  }
};
