/**
 * middleware/i18nMiddleware.js
 * ============================
 * Loads all locale JSON files **once** at module initialisation (startup)
 * and makes the serialised result available in two places:
 *
 *   1. `app.locals.i18nLocalesJSON`  — set once in app.js via the exported
 *      `localesJSON` constant.  `app.locals` is automatically merged into
 *      every EJS render call by Express's `app.render()`, so this variable
 *      is available in layouts, partials and pages regardless of middleware
 *      execution order or res.locals state.
 *
 *   2. `res.locals.i18nLocalesJSON`  — set per-request by i18nMiddleware as
 *      a belt-and-suspenders secondary guarantee.  `res.locals` has higher
 *      merge priority than `app.locals`, so it safely overrides if needed.
 *
 * The client-side i18n.js reads window.__i18n (embedded in main.ejs <head>)
 * and handles instant language switching without page reload.
 */

import { readFileSync } from 'fs';
import path              from 'path';
import { fileURLToPath } from 'url';

const __dirname   = path.dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = path.join(__dirname, '..', 'locales');

/** Load and parse a single locale file.  Throws clearly on any failure. */
function loadLocale(lang) {
  const filePath = path.join(LOCALES_DIR, `${lang}.json`);
  let raw;
  try {
    raw = readFileSync(filePath, 'utf8');
  } catch (ioErr) {
    throw new Error(
      `[i18n] Cannot read locale file "${filePath}": ${ioErr.message}`
    );
  }
  try {
    return JSON.parse(raw);
  } catch (parseErr) {
    throw new Error(
      `[i18n] Invalid JSON in locale file "${filePath}": ${parseErr.message}`
    );
  }
}

/**
 * All three locale objects, loaded once at startup.
 * Exported so app.js can reference them without re-loading.
 *
 * This runs during ES module evaluation, which — because of static import
 * hoisting — happens BEFORE app.js's own top-level code (including its
 * process.on('uncaughtException') handlers) ever executes. If loadLocale()
 * throws here uncaught, Node prints a raw unhandled-exception stack trace
 * and exits before "Routes loaded", before bootstrap(), before app.listen()
 * — indistinguishable from the outside from "the server just won't start".
 * The try/catch below gives that failure the same clear, actionable
 * diagnostic app.js's own start() function gives every other startup error.
 */
export let locales;
try {
  locales = {
    ka: loadLocale('ka'),
    en: loadLocale('en'),
    ru: loadLocale('ru'),
  };
} catch (err) {
  console.error('\n  ✗ Fatal startup error — locale data could not be loaded.');
  console.error('    Message :', err.message);
  process.exit(1);
}

/**
 * Pre-serialised JSON string of all locales.
 * Export this as a **named export** so app.js can call:
 *
 *   app.locals.i18nLocalesJSON = localesJSON;
 *
 * That single line guarantees the variable is available in every EJS
 * template, layout and partial without relying on per-request middleware.
 */
export const localesJSON = JSON.stringify(locales);

/**
 * Express middleware — belt-and-suspenders per-request setter.
 *
 * Sets `res.locals.i18nLocalesJSON` so the value is available even on code
 * paths where `app.locals` might not have been configured yet (e.g. tests,
 * sub-apps).  Calls `next()` unconditionally so the chain never stalls.
 */
export function i18nMiddleware(req, res, next) {
  res.locals.i18nLocalesJSON = localesJSON;
  next();
}

export default i18nMiddleware;
