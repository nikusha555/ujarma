/**
 * app.js — Ujarma Official Village Website
 * ==========================================
 * Main application entry point.
 * Architecture: MVC | Runtime: Node.js ES Modules
 */

import express          from 'express';
import expressLayouts   from 'express-ejs-layouts';
import session          from 'express-session';
import helmet           from 'helmet';
import compression      from 'compression';
import path             from 'path';
import { fileURLToPath } from 'url';
import { readFileSync }  from 'fs';
import dotenv           from 'dotenv';

// Load environment variables before anything else
dotenv.config();

// Resolve __dirname in ES Module context
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// Read package.json version for static asset cache-busting.
// Changing package.json "version" on each deployment will automatically
// invalidate any browser-cached copy of style.css / main.js.
const { version: PKG_VERSION } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url))
);

// ─────────────────────────────────────────────
// Global Process Error Handlers
// Catch anything that escapes try/catch blocks so
// the process never disappears silently.
// ─────────────────────────────────────────────
process.on('uncaughtException', (err) => {
  console.error('\n  ✗ [uncaughtException]');
  console.error('    Message :', err.message);
  console.error('    File    :', err.fileName ?? '(unknown)');
  console.error('    Stack   :\n', err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('\n  ✗ [unhandledRejection]');
  if (reason instanceof Error) {
    console.error('    Message :', reason.message);
    console.error('    Stack   :\n', reason.stack);
  } else {
    console.error('    Reason  :', reason);
  }
  process.exit(1);
});

// Route imports
import indexRouter from './routes/index.js';
import adminRouter from './routes/admin.js';

// Error handling middleware
import { errorHandler, notFoundHandler } from './middleware/errorMiddleware.js';

// i18n — loads locale JSON files for client-side translations.
// We import BOTH the default middleware function AND the named `localesJSON`
// constant so we can set it on app.locals once at startup.
import i18nMiddleware, { localesJSON as i18nLocalesJSON } from './middleware/i18nMiddleware.js';

// Bootstrap — database creation, table migration, seed data
import bootstrap from './config/bootstrap.js';

// ─────────────────────────────────────────────
// Initialize Application
// ─────────────────────────────────────────────
const app = express();
const PORT     = process.env.PORT     || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ─────────────────────────────────────────────
// Security — Helmet
// Configures HTTP security headers
// ─────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc:  ["'self'"],
        styleSrc:    ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdn.jsdelivr.net'],
        fontSrc:     ["'self'", 'https://fonts.gstatic.com'],
        scriptSrc:   ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
        imgSrc:      ["'self'", 'data:', 'https:'],
        connectSrc:  ["'self'"],
        objectSrc:   ["'none'"],
        upgradeInsecureRequests: NODE_ENV === 'production' ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// ─────────────────────────────────────────────
// Performance — Compression
// ─────────────────────────────────────────────
app.use(compression());

// ─────────────────────────────────────────────
// Body Parsing
// ─────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ─────────────────────────────────────────────
// Session Management
// ─────────────────────────────────────────────
app.use(
  session({
    secret:            process.env.SESSION_SECRET || 'ujarma-fallback-secret',
    resave:            false,
    saveUninitialized: false,
    cookie: {
      secure:   NODE_ENV === 'production',
      httpOnly: true,
      maxAge:   1000 * 60 * 60 * 24, // 24 hours
      sameSite: 'lax',
    },
  })
);

// ─────────────────────────────────────────────
// Static Assets
// ─────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '7d' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─────────────────────────────────────────────
// View Engine — EJS with Layout Support
// ─────────────────────────────────────────────
app.use(expressLayouts);
app.set('layout',      'layouts/main');
app.set('views',       path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// ─────────────────────────────────────────────
// Global Template Locals
// Variables available in every EJS template
// ─────────────────────────────────────────────

// assetVersion is set once here so every layout/partial can use it
// without repeating the lookup.  Bump package.json "version" on each
// deployment to bust the browser cache automatically.
app.locals.assetVersion = process.env.ASSET_VERSION || PKG_VERSION;

// ─────────────────────────────────────────────────────────────────────────────
// i18n locale data — set ONCE on app.locals so it is available in every
// EJS render call (layouts, partials, pages) automatically via Express's
// app.render() merge, regardless of middleware order or res.locals state.
// This is the primary source of truth.  The per-request i18nMiddleware below
// provides a belt-and-suspenders res.locals copy.
// ─────────────────────────────────────────────────────────────────────────────
app.locals.i18nLocalesJSON = i18nLocalesJSON;

app.use((req, res, next) => {
  res.locals.currentPath    = req.path;
  res.locals.currentYear    = new Date().getFullYear();
  res.locals.siteName       = 'უჯარმა';
  res.locals.siteTagline    = 'უჯარმის ოფიციალური საინფორმაციო პორტალი';
  res.locals.siteUrl        = process.env.SITE_URL || 'https://ujarma.ge';
  res.locals.isAdmin        = req.session?.isAdmin === true;
  next();
});

// ─────────────────────────────────────────────
// i18n — locale data for client-side switching
// ─────────────────────────────────────────────
app.use(i18nMiddleware);

// ─────────────────────────────────────────────
// Application Routes
// ─────────────────────────────────────────────
app.use('/',       indexRouter);
app.use('/admin',  adminRouter);
console.log('  ✓ Routes loaded');

// ─────────────────────────────────────────────
// Error Handling (must come last)
// ─────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─────────────────────────────────────────────
// Start Server
// Bootstrap runs first; HTTP port binds only on success.
// ─────────────────────────────────────────────
const start = async () => {
  try {
    // ── Step 1: Database bootstrap ──────────────
    await bootstrap();
    console.log('  ✓ Bootstrap complete');

    // ── Step 2: Bind HTTP server ─────────────────
    const server = app.listen(PORT, () => {
      console.log('  ✓ Session configured');
      console.log('  ✓ Database connected');
      console.log(`  ✓ Express listening on port ${PORT}`);
      console.log(
        `\n  ╔══════════════════════════════════════════════╗\n` +
        `  ║         UJARMA — OFFICIAL VILLAGE WEBSITE    ║\n` +
        `  ║         Official Information Portal          ║\n` +
        `  ╠══════════════════════════════════════════════╣\n` +
        `  ║  Status : Running                            ║\n` +
        `  ║  Port   : ${String(PORT).padEnd(34)}║\n` +
        `  ║  Mode   : ${String(NODE_ENV).padEnd(34)}║\n` +
        `  ║  URL    : http://localhost:${String(PORT).padEnd(18)}║\n` +
        `  ╚══════════════════════════════════════════════╝`
      );
    });

    // ── Port-in-use guard ────────────────────────
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n  ✗ Port ${PORT} is already in use.`);
        console.error(`    Kill the process using that port and restart:`);
        console.error(`    netstat -ano | findstr :${PORT}    (Windows)`);
        console.error(`    lsof -i :${PORT}                   (macOS/Linux)`);
      } else {
        console.error('\n  ✗ Server error:', err.message);
        console.error(err.stack);
      }
      process.exit(1);
    });

  } catch (err) {
    console.error('\n  ✗ Fatal startup error — server will not start.');
    console.error('    Message :', err.message);
    console.error('    Stack   :\n', err.stack);
    process.exit(1);
  }
};

start();

export default app;