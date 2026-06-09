/**
 * middleware/authMiddleware.js — Admin Authentication Guard
 * ==========================================================
 * Protects all admin routes from unauthenticated access.
 * Redirects to login while preserving the intended destination.
 */

/**
 * Middleware: requireAdmin
 * Verifies that the current session has admin privileges.
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const requireAdmin = (req, res, next) => {
  if (req.session?.isAdmin === true) {
    return next();
  }

  // Store the original URL so we can redirect back after login
  req.session.returnTo = req.originalUrl;
  res.redirect('/admin/login');
};
