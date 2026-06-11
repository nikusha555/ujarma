/**
 * routes/admin.js — Admin Panel Routes (full CRUD)
 */

import { Router }       from 'express';
import { requireAdmin } from '../middleware/authMiddleware.js';

import uploadNews        from '../config/multerNews.js';
import uploadAttractions from '../config/multerAttractions.js';
import uploadGallery     from '../config/multerGallery.js';

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

const handleNewsUpload        = makeUploadHandler(uploadNews);
const handleAttractionUpload  = makeUploadHandler(uploadAttractions);
const handleGalleryUpload     = makeUploadHandler(uploadGallery);

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
router.post('/news/create',     handleNewsUpload, postAdminNewsCreate);
router.get('/news/:id/edit',    getAdminNewsEdit);
router.post('/news/:id/edit',   handleNewsUpload, postAdminNewsEdit);
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
