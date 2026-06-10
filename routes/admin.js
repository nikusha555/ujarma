/**
 * routes/admin.js — Admin Panel Routes
 * ======================================
 * Login and logout are public.
 * All other routes are protected by the requireAdmin middleware.
 */

import { Router }          from 'express';
import { requireAdmin }    from '../middleware/authMiddleware.js';
import uploadNews          from '../config/multerNews.js';
import {
  getAdminLogin,
  postAdminLogin,
  getAdminLogout,
  getDashboard,
  getAdminAttractions,
  getAdminGallery,
} from '../controllers/adminController.js';
import {
  getAdminNewsList,
  getAdminNewsCreate,
  postAdminNewsCreate,
  getAdminNewsEdit,
  postAdminNewsEdit,
  postAdminNewsDelete,
} from '../controllers/newsAdminController.js';

const router = Router();

/**
 * Multer error handler — attaches upload errors to req.fileError
 * instead of crashing so the controller can display them inline.
 */
const handleUpload = (req, res, next) => {
  uploadNews.single('image')(req, res, (err) => {
    if (err) {
      req.fileError = err.code === 'LIMIT_FILE_SIZE'
        ? 'სურათის ზომა არ უნდა აღემატებოდეს 5 MB-ს.'
        : err.message;
    }
    next();
  });
};

// ── Public Auth Routes ─────────────────────────
router.get('/login',  getAdminLogin);
router.post('/login', postAdminLogin);
router.get('/logout', getAdminLogout);

// ── Protected Routes ───────────────────────────
router.use(requireAdmin);

router.get('/',            getDashboard);
router.get('/dashboard',   getDashboard);

// ── News CRUD ──────────────────────────────────
router.get('/news',                getAdminNewsList);
router.get('/news/create',         getAdminNewsCreate);
router.post('/news/create',        handleUpload, postAdminNewsCreate);
router.get('/news/:id/edit',       getAdminNewsEdit);
router.post('/news/:id/edit',      handleUpload, postAdminNewsEdit);
router.post('/news/:id/delete',    postAdminNewsDelete);

// ── Other content sections ─────────────────────
router.get('/attractions', getAdminAttractions);
router.get('/gallery',     getAdminGallery);

export default router;
