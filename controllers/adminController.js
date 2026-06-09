/**
 * controllers/adminController.js — Admin Panel Controller
 * =========================================================
 * Handles admin dashboard, content management views,
 * and authentication (login / logout).
 */

import News        from '../models/News.js';
import Attraction  from '../models/Attraction.js';
import GalleryItem from '../models/GalleryItem.js';
import bcrypt      from 'bcryptjs';
import pool        from '../config/db.js';

// ─────────────────────────────────────────────
// Authentication
// ─────────────────────────────────────────────

/**
 * GET /admin/login
 * Renders the admin login page.
 */
export const getAdminLogin = (req, res) => {
  if (req.session?.isAdmin) return res.redirect('/admin');

  res.render('admin/login', {
    layout: false,
    title:  'Admin Login — Ujarma',
    error:  null,
  });
};

/**
 * POST /admin/login
 * Fetches the admin record from the database and verifies the submitted
 * password against the bcrypt hash stored in admins.password_hash.
 */
export const postAdminLogin = async (req, res) => {
  const { username, password } = req.body;

  // Basic presence check before hitting the DB
  if (!username?.trim() || !password) {
    return res.status(401).render('admin/login', {
      layout: false,
      title:  'ადმინისტრატორის შესვლა — უჯარმა',
      error:  'გთხოვთ შეავსოთ ყველა ველი.',
    });
  }

  try {
    // Look up the account by username
    const [rows] = await pool.execute(
      'SELECT id, username, password_hash FROM admins WHERE username = ? LIMIT 1',
      [username.trim()]
    );

    if (rows.length === 0) {
      return res.status(401).render('admin/login', {
        layout: false,
        title:  'ადმინისტრატორის შესვლა — უჯარმა',
        error:  'არასწორი მომხმარებელი ან პაროლი.',
      });
    }

    const admin = rows[0];

    // Compare submitted password against the stored bcrypt hash
    const passwordMatch = await bcrypt.compare(password, admin.password_hash);

    if (!passwordMatch) {
      return res.status(401).render('admin/login', {
        layout: false,
        title:  'ადმინისტრატორის შესვლა — უჯარმა',
        error:  'არასწორი მომხმარებელი ან პაროლი.',
      });
    }

    // Credentials valid — establish authenticated session
    req.session.isAdmin   = true;
    req.session.adminId   = admin.id;
    req.session.adminUser = admin.username;

    req.session.save(() => {
      const returnTo = req.session.returnTo || '/admin';
      delete req.session.returnTo;
      res.redirect(returnTo);
    });

  } catch (err) {
    console.error('[Admin Login Error]', err.message);
    res.status(500).render('admin/login', {
      layout: false,
      title:  'ადმინისტრატორის შესვლა — უჯარმა',
      error:  'სერვერის შეცდომა. გთხოვთ სცადოთ მოგვიანებით.',
    });
  }
};

/**
 * GET /admin/logout
 * Destroys the admin session and redirects to login.
 */
export const getAdminLogout = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/admin/login');
  });
};

// ─────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────

/**
 * GET /admin  |  GET /admin/dashboard
 * Renders the admin dashboard with summary statistics.
 */
export const getDashboard = async (req, res, next) => {
  try {
    const [newsCount, attractions, gallery] = await Promise.all([
      News.count().catch(() => 0),
      Attraction.findAll().catch(() => []),
      GalleryItem.findAll().catch(() => []),
    ]);

    res.render('admin/dashboard', {
      layout: 'layouts/admin',
      title:  'Dashboard — Ujarma Admin',
      stats:  {
        news:        newsCount,
        attractions: attractions.length,
        gallery:     gallery.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// Content Management
// ─────────────────────────────────────────────

/**
 * GET /admin/news
 * Renders the news management table.
 */
export const getAdminNews = async (req, res, next) => {
  try {
    const articles = await News.findAll(50).catch(() => []);

    res.render('admin/news', {
      layout:   'layouts/admin',
      title:    'News Management — Ujarma Admin',
      articles,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /admin/attractions
 * Renders the attractions management table.
 */
export const getAdminAttractions = async (req, res, next) => {
  try {
    const attractions = await Attraction.findAll().catch(() => []);

    res.render('admin/attractions', {
      layout:      'layouts/admin',
      title:       'Attractions Management — Ujarma Admin',
      attractions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /admin/gallery
 * Renders the gallery management page.
 */
export const getAdminGallery = async (req, res, next) => {
  try {
    const items = await GalleryItem.findAll().catch(() => []);

    res.render('admin/gallery', {
      layout: 'layouts/admin',
      title:  'Gallery Management — Ujarma Admin',
      items,
    });
  } catch (error) {
    next(error);
  }
};
