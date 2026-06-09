/**
 * middleware/errorMiddleware.js — Centralised Error Handling
 * ============================================================
 * Provides a 404 handler and a global error handler.
 * Must be registered after all routes in app.js.
 */

/**
 * 404 Not Found Handler
 * Creates a 404 error and passes it to the global handler.
 */
export const notFoundHandler = (req, res, next) => {
  const error  = new Error(`Not Found — ${req.originalUrl}`);
  error.status = 404;
  next(error);
};

/**
 * Global Error Handler
 * Renders a user-friendly error page.
 * In development mode, the technical error message is shown.
 */
export const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  const statusCode    = err.status || err.statusCode || 500;
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const isAdminRoute  = req.path.startsWith('/admin');

  // Log errors in development; keep production logs clean
  if (isDevelopment) {
    console.error(`[Error ${statusCode}] ${err.message}`);
    if (statusCode === 500) console.error(err.stack);
  }

  const messages = {
    400: 'The request could not be understood.',
    403: 'You do not have permission to access this page.',
    404: 'The page you are looking for could not be found.',
    500: 'An unexpected error occurred. Please try again later.',
  };

  res.status(statusCode).render('pages/error', {
    layout:     isAdminRoute ? 'layouts/admin' : 'layouts/main',
    title:      `${statusCode} — Ujarma`,
    statusCode,
    message:    messages[statusCode] || messages[500],
    detail:     isDevelopment ? err.message : null,
  });
};
