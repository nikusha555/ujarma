/**
 * controllers/galleryAdminController.js — Admin Gallery CRUD
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import GalleryItem from '../models/GalleryItem.js';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'gallery');

const unlinkImage = (f) => f && fs.unlink(path.join(UPLOAD_DIR, f), () => {});

// ── LIST ─────────────────────────────────────────────────
export const getAdminGalleryList = async (req, res, next) => {
  try {
    const page       = Math.max(1, parseInt(req.query.page     || '1', 10));
    const search     = req.query.search     || '';
    const categoryId = req.query.category   || '';

    const [{ rows, total }, categories] = await Promise.all([
      GalleryItem.adminFindAll({ page, perPage: 20, search, categoryId }),
      GalleryItem.getCategories(),
    ]);

    res.render('admin/gallery', {
      layout:     'layouts/admin',
      title:      'გალერეის მართვა — უჯარმა ადმინი',
      items: rows,
      categories,
      total,
      page,
      totalPages: Math.ceil(total / 20),
      search,
      categoryId,
      flash: req.query.flash || null,
    });
  } catch (err) { next(err); }
};

// ── CREATE FORM ──────────────────────────────────────────
export const getAdminGalleryCreate = async (req, res, next) => {
  try {
    const categories = await GalleryItem.getCategories();
    res.render('admin/gallery-create', {
      layout: 'layouts/admin',
      title:  'ფოტოს დამატება — უჯარმა ადმინი',
      categories,
      formData: {},
      errors:   [],
    });
  } catch (err) { next(err); }
};

// ── CREATE SUBMIT ────────────────────────────────────────
export const postAdminGalleryCreate = async (req, res, next) => {
  const uploadError = req.fileError || null;
  try {
    const { title, category_id } = req.body;

    const errors = [];
    if (uploadError) errors.push(uploadError);
    if (!title?.trim()) errors.push('სახელწოდება სავალდებულოა.');
    if (!req.file && !uploadError) errors.push('სურათი სავალდებულოა.');

    const categories = await GalleryItem.getCategories();
    if (errors.length) {
      if (req.file) unlinkImage(req.file.filename);
      return res.status(400).render('admin/gallery-create', {
        layout: 'layouts/admin',
        title:  'ფოტოს დამატება — უჯარმა ადმინი',
        categories, formData: req.body, errors,
      });
    }

    await GalleryItem.create({
      title:      title.trim(),
      image:      req.file.filename,
      categoryId: category_id || null,
    });
    res.redirect('/admin/gallery?flash=created');
  } catch (err) {
    if (req.file) unlinkImage(req.file.filename);
    next(err);
  }
};

// ── EDIT FORM ────────────────────────────────────────────
export const getAdminGalleryEdit = async (req, res, next) => {
  try {
    const [item, categories] = await Promise.all([
      GalleryItem.findById(parseInt(req.params.id, 10)),
      GalleryItem.getCategories(),
    ]);
    if (!item) { const e = new Error('ვერ მოიძებნა'); e.status = 404; return next(e); }

    res.render('admin/gallery-edit', {
      layout: 'layouts/admin',
      title:  'ფოტოს რედაქტირება — უჯარმა ადმინი',
      categories, item, errors: [],
    });
  } catch (err) { next(err); }
};

// ── EDIT SUBMIT ──────────────────────────────────────────
export const postAdminGalleryEdit = async (req, res, next) => {
  const uploadError = req.fileError || null;
  const id = parseInt(req.params.id, 10);
  try {
    const existing = await GalleryItem.findById(id);
    if (!existing) { if (req.file) unlinkImage(req.file.filename); const e = new Error('ვერ მოიძებნა'); e.status = 404; return next(e); }

    const { title, category_id, remove_image } = req.body;

    const errors = [];
    if (uploadError) errors.push(uploadError);
    if (!title?.trim()) errors.push('სახელწოდება სავალდებულოა.');

    const categories = await GalleryItem.getCategories();
    if (errors.length) {
      if (req.file) unlinkImage(req.file.filename);
      return res.status(400).render('admin/gallery-edit', {
        layout: 'layouts/admin',
        title:  'ფოტოს რედაქტირება — უჯარმა ადმინი',
        categories, item: { ...existing, ...req.body, id }, errors,
      });
    }

    let newImage = existing.image;
    if (req.file) { unlinkImage(existing.image); newImage = req.file.filename; }
    else if (remove_image === 'on') { unlinkImage(existing.image); newImage = null; }

    await GalleryItem.update(id, {
      title:      title.trim(),
      categoryId: category_id || null,
      image:      newImage,
    });
    res.redirect('/admin/gallery?flash=updated');
  } catch (err) {
    if (req.file) unlinkImage(req.file.filename);
    next(err);
  }
};

// ── DELETE ───────────────────────────────────────────────
export const postAdminGalleryDelete = async (req, res, next) => {
  try {
    const filename = await GalleryItem.delete(parseInt(req.params.id, 10));
    unlinkImage(filename);
    res.redirect('/admin/gallery?flash=deleted');
  } catch (err) { next(err); }
};
