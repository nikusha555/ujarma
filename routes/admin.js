/**
 * routes/admin.js — Admin Panel Routes
 * ======================================
 * Login and logout are public.
 * All other routes are protected by the requireAdmin middleware.
 */

import { Router }          from 'express';
import { requireAdmin }    from '../middleware/authMiddleware.js';
import {
  getAdminLogin,
  postAdminLogin,
  getAdminLogout,
  getDashboard,
  getAdminNews,
  getAdminAttractions,
  getAdminGallery,
} from '../controllers/adminController.js';

const router = Router();

// ── Public Auth Routes ─────────────────────────
router.get('/login',  getAdminLogin);
router.post('/login', postAdminLogin);
router.get('/logout', getAdminLogout);

// ── Protected Routes ───────────────────────────
// Every route below this line requires admin authentication
router.use(requireAdmin);

router.get('/',            getDashboard);
router.get('/dashboard',   getDashboard);
router.get('/news',        getAdminNews);
router.get('/attractions', getAdminAttractions);
router.get('/gallery',     getAdminGallery);

export default router;
