/**
 * controllers/attractionsAdminController.js — Admin Attractions CRUD
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import Attraction from '../models/Attraction.js';
import { slugify } from '../utils/slugify.js';

const __dirname    = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR   = path.join(__dirname, '..', 'uploads', 'attractions');

const unlinkImage  = (f) => f && fs.unlink(path.join(UPLOAD_DIR, f), () => {});

const imgUrl = (f) => f ? `/uploads/attractions/${f}` : null;

const uniqueSlug = async (name, excludeId = null) => {
  let base = slugify(name) || `attraction-${Date.now()}`;
  let candidate = base;
  let i = 1;
  while (await Attraction.slugExists(candidate, excludeId)) {
    candidate = `${base}-${i++}`;
  }
  return candidate;
};

// ── LIST ─────────────────────────────────────────────────
export const getAdminAttractionsList = async (req, res, next) => {
  try {
    const page     = Math.max(1, parseInt(req.query.page     || '1', 10));
    const search   = req.query.search   || '';
    const category = req.query.category || '';

    const [{ rows, total }, categories] = await Promise.all([
      Attraction.adminFindAll({ page, perPage: 15, search, category }),
      Attraction.getCategories(),
    ]);

    res.render('admin/attractions', {
      layout:     'layouts/admin',
      title:      'ღირსშესანიშნაობების მართვა — უჯარმა ადმინი',
      attractions: rows,
      categories,
      total,
      page,
      totalPages: Math.ceil(total / 15),
      search,
      category,
      flash:      req.query.flash || null,
    });
  } catch (err) { next(err); }
};

// ── CREATE FORM ──────────────────────────────────────────
export const getAdminAttractionsCreate = async (req, res, next) => {
  try {
    const categories = await Attraction.getCategories();
    res.render('admin/attractions-create', {
      layout: 'layouts/admin',
      title:  'ღირსშესანიშნაობის დამატება — უჯარმა ადმინი',
      categories,
      formData: {},
      errors:   [],
    });
  } catch (err) { next(err); }
};

// ── CREATE SUBMIT ────────────────────────────────────────
export const postAdminAttractionsCreate = async (req, res, next) => {
  const uploadError = req.fileError || null;
  try {
    const { name, description, category, is_featured, is_published } = req.body;

    const errors = [];
    if (uploadError) errors.push(uploadError);
    if (!name?.trim()) errors.push('სახელი სავალდებულოა.');
    if (!description?.trim()) errors.push('აღწერა სავალდებულოა.');

    const categories = await Attraction.getCategories();
    if (errors.length) {
      if (req.file) unlinkImage(req.file.filename);
      return res.status(400).render('admin/attractions-create', {
        layout: 'layouts/admin',
        title:  'ღირსშესანიშნაობის დამატება — უჯარმა ადმინი',
        categories, formData: req.body, errors,
      });
    }

    const slug = await uniqueSlug(name.trim());
    await Attraction.create({
      name: name.trim(), slug,
      description: description.trim(),
      image:       req.file ? req.file.filename : null,
      category:    category || null,
      isFeatured:  is_featured  === 'on',
      isPublished: is_published === 'on',
    });
    res.redirect('/admin/attractions?flash=created');
  } catch (err) {
    if (req.file) unlinkImage(req.file.filename);
    next(err);
  }
};

// ── EDIT FORM ────────────────────────────────────────────
export const getAdminAttractionsEdit = async (req, res, next) => {
  try {
    const [attraction, categories] = await Promise.all([
      Attraction.findById(parseInt(req.params.id, 10)),
      Attraction.getCategories(),
    ]);
    if (!attraction) { const e = new Error('ვერ მოიძებნა'); e.status = 404; return next(e); }

    res.render('admin/attractions-edit', {
      layout: 'layouts/admin',
      title:  'ღირსშესანიშნაობის რედაქტირება — უჯარმა ადმინი',
      categories, attraction, errors: [],
    });
  } catch (err) { next(err); }
};

// ── EDIT SUBMIT ──────────────────────────────────────────
export const postAdminAttractionsEdit = async (req, res, next) => {
  const uploadError = req.fileError || null;
  const id = parseInt(req.params.id, 10);
  try {
    const existing = await Attraction.findById(id);
    if (!existing) { if (req.file) unlinkImage(req.file.filename); const e = new Error('ვერ მოიძებნა'); e.status = 404; return next(e); }

    const { name, description, category, is_featured, is_published, remove_image } = req.body;

    const errors = [];
    if (uploadError) errors.push(uploadError);
    if (!name?.trim()) errors.push('სახელი სავალდებულოა.');
    if (!description?.trim()) errors.push('აღწერა სავალდებულოა.');

    const categories = await Attraction.getCategories();
    if (errors.length) {
      if (req.file) unlinkImage(req.file.filename);
      return res.status(400).render('admin/attractions-edit', {
        layout: 'layouts/admin',
        title:  'ღირსშესანიშნაობის რედაქტირება — უჯარმა ადმინი',
        categories, attraction: { ...existing, ...req.body, id }, errors,
      });
    }

    let slug = existing.slug;
    if (name.trim() !== existing.name) slug = await uniqueSlug(name.trim(), id);

    let newImage = existing.image;
    if (req.file) { unlinkImage(existing.image); newImage = req.file.filename; }
    else if (remove_image === 'on') { unlinkImage(existing.image); newImage = null; }

    await Attraction.update(id, {
      name: name.trim(), slug,
      description: description.trim(),
      image: newImage,
      category: category || null,
      isFeatured:  is_featured  === 'on',
      isPublished: is_published === 'on',
    });
    res.redirect('/admin/attractions?flash=updated');
  } catch (err) {
    if (req.file) unlinkImage(req.file.filename);
    next(err);
  }
};

// ── DELETE ───────────────────────────────────────────────
export const postAdminAttractionsDelete = async (req, res, next) => {
  try {
    const filename = await Attraction.delete(parseInt(req.params.id, 10));
    unlinkImage(filename);
    res.redirect('/admin/attractions?flash=deleted');
  } catch (err) { next(err); }
};

export { imgUrl as attractionImgUrl };
