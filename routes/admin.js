/**
 * routes/admin.js — Admin Panel Routes (full CRUD)
 */

import { Router }       from 'express';
import { requireAdmin } from '../middleware/authMiddleware.js';

import uploadAttractions from '../config/multerAttractions.js';
import uploadGallery     from '../config/multerGallery.js';
import uploadNewsMedia, { MAX_FILES_PER_UPLOAD } from '../config/multerNewsMedia.js';

import {
  getAdminLogin, postAdminLogin, getAdminLogout,
  getDashboard,
} from '../controllers/adminController.js';

import {
  getAdminNewsList, getAdminNewsCreate, postAdminNewsCreate,
  getAdminNewsEdit, postAdminNewsEdit, postAdminNewsDelete,
} from '../controllers/newsAdminController.js';

import {
  getAdminAttractionsList, getAdminAttractionsCreate, postAdminAttractionsCreate,
  getAdminAttractionsEdit, postAdminAttractionsEdit, postAdminAttractionsDelete,
} from '../controllers/attractionsAdminController.js';

import {
  getAdminGalleryList, getAdminGalleryCreate, postAdminGalleryCreate,
  getAdminGalleryEdit, postAdminGalleryEdit, postAdminGalleryDelete,
} from '../controllers/galleryAdminController.js';

const router = Router();

/** Wrap a multer instance so upload errors are stored on req.fileError. */
const makeUploadHandler = (multerInstance, field = 'image') =>
  (req, res, next) => {
    multerInstance.single(field)(req, res, (err) => {
      if (err) {
        req.fileError = err.code === 'LIMIT_FILE_SIZE'
          ? 'სურათის ზომა არ უნდა აღემატებოდეს 5 MB-ს.'
          : err.message;
      }
      next();
    });
  };

const handleAttractionUpload  = makeUploadHandler(uploadAttractions);
const handleGalleryUpload     = makeUploadHandler(uploadGallery);

/**
 * News "მედია" section — multiple images + video from one field,
 * uploaded together with the rest of the create/edit form. Same
 * req.fileError convention as makeUploadHandler above, translated
 * to plain Georgian (never expose the raw Multer/Node error).
 */
const handleNewsMediaUpload = (req, res, next) => {
  uploadNewsMedia.array('media', MAX_FILES_PER_UPLOAD)(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        req.fileError = 'ერთ-ერთი ფაილის ზომა ძალიან დიდია.';
      } else if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
        req.fileError = `ერთდროულად მაქსიმუმ ${MAX_FILES_PER_UPLOAD} ფაილის ატვირთვაა შესაძლებელი.`;
      } else {
        req.fileError = err.message || 'ფაილის ატვირთვა ვერ მოხერხდა.';
      }
    }
    next();
  });
};

// ── Public Auth ────────────────────────────────
router.get('/login',  getAdminLogin);
router.post('/login', postAdminLogin);
router.get('/logout', getAdminLogout);

// ── Protected (require session) ────────────────
router.use(requireAdmin);

router.get('/',          getDashboard);
router.get('/dashboard', getDashboard);

// ── News CRUD ──────────────────────────────────
router.get('/news',             getAdminNewsList);
router.get('/news/create',      getAdminNewsCreate);
router.post('/news/create',     handleNewsMediaUpload, postAdminNewsCreate);
router.get('/news/:id/edit',    getAdminNewsEdit);
router.post('/news/:id/edit',   handleNewsMediaUpload, postAdminNewsEdit);
router.post('/news/:id/delete', postAdminNewsDelete);

// ── Attractions CRUD ───────────────────────────
router.get('/attractions',             getAdminAttractionsList);
router.get('/attractions/create',      getAdminAttractionsCreate);
router.post('/attractions/create',     handleAttractionUpload, postAdminAttractionsCreate);
router.get('/attractions/:id/edit',    getAdminAttractionsEdit);
router.post('/attractions/:id/edit',   handleAttractionUpload, postAdminAttractionsEdit);
router.post('/attractions/:id/delete', postAdminAttractionsDelete);

// ── Gallery CRUD ───────────────────────────────
router.get('/gallery',             getAdminGalleryList);
router.get('/gallery/create',      getAdminGalleryCreate);
router.post('/gallery/create',     handleGalleryUpload, postAdminGalleryCreate);
router.get('/gallery/:id/edit',    getAdminGalleryEdit);
router.post('/gallery/:id/edit',   handleGalleryUpload, postAdminGalleryEdit);
router.post('/gallery/:id/delete', postAdminGalleryDelete);

export default router;
