/**
 * scripts/i18n-lib.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared helpers for scripts/i18n-validate.js and scripts/i18n-sync.js.
 * Not intended to be run directly.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const ROOT     = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const LOCALES_DIR = path.join(ROOT, 'locales');
export const LANGS     = ['ka', 'en', 'ru'];
export const SOURCE_LANG = 'ka'; // server-rendered baseline — treated as the key source of truth

/** Namespaces known to exist in the locale files — used to recognise dynamic
 *  i18n keys built from template literals in .js files (e.g. `error.${x}Message`). */
const KNOWN_NAMESPACES = [
  'site', 'nav', 'lang', 'breadcrumb', 'hero', 'heritage', 'home', 'footer',
  'contact', 'news', 'newsArticle', 'attractions', 'attractionDetail',
  'gallery', 'about', 'error', 'common',
];

/** data-i18n* attributes whose value is a translation key (data-i18n-date and
 *  data-i18n-date-style are excluded — they hold a raw date / a style name). */
const I18N_ATTRS = ['data-i18n', 'data-i18n-html', 'data-i18n-placeholder', 'data-i18n-aria-label', 'data-i18n-title'];

function walkFiles(dir, extensions, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(full, extensions, out);
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      out.push(full);
    }
  }
  return out;
}

export function listViewFiles() {
  return walkFiles(path.join(ROOT, 'views'), ['.ejs']);
}

export function listSourceJsFiles() {
  return [
    ...walkFiles(path.join(ROOT, 'controllers'), ['.js']),
    ...walkFiles(path.join(ROOT, 'middleware'), ['.js']),
    ...walkFiles(path.join(ROOT, 'public', 'js'), ['.js']),
  ];
}

/** Read a locale file's raw text (preserves original CRLF/LF for round-tripping). */
export function readLocaleRaw(lang) {
  return fs.readFileSync(path.join(LOCALES_DIR, `${lang}.json`), 'utf8');
}

export function readLocale(lang) {
  return JSON.parse(readLocaleRaw(lang));
}

/** Write a locale object back out, preserving 2-space indent + the file's
 *  original line-ending style and trailing newline. */
export function writeLocale(lang, obj) {
  const filePath = path.join(LOCALES_DIR, `${lang}.json`);
  const raw = fs.readFileSync(filePath, 'utf8');
  const useCRLF = raw.includes('\r\n');
  const hadTrailingNewline = /\r?\n$/.test(raw);
  let out = JSON.stringify(obj, null, 2);
  if (useCRLF) out = out.replace(/\n/g, '\r\n');
  if (hadTrailingNewline) out += useCRLF ? '\r\n' : '\n';
  fs.writeFileSync(filePath, out, 'utf8');
}

/** Flattens a nested locale object into a Map<dotPath, stringValue>. */
export function flatten(obj, prefix = '', out = new Map()) {
  for (const key of Object.keys(obj)) {
    const dotPath = prefix ? `${prefix}.${key}` : key;
    const val = obj[key];
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      flatten(val, dotPath, out);
    } else {
      out.set(dotPath, val);
    }
  }
  return out;
}

/** Sets a value at a dot-separated path, creating intermediate objects as needed. */
export function setAtPath(obj, dotPath, value) {
  const parts = dotPath.split('.');
  let node = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!node[parts[i]] || typeof node[parts[i]] !== 'object') node[parts[i]] = {};
    node = node[parts[i]];
  }
  node[parts[parts.length - 1]] = value;
}

export function getAtPath(obj, dotPath) {
  return dotPath.split('.').reduce((n, k) => (n && typeof n === 'object' ? n[k] : undefined), obj);
}

/**
 * Scans raw JSON text for duplicate object keys — information JSON.parse
 * silently discards (the last duplicate wins, earlier ones vanish with no
 * error). Returns [{ key, index }] for every key seen more than once at the
 * same nesting level.
 */
export function findDuplicateKeys(raw) {
  const dups = [];
  const stack = [new Set()];
  let i = 0;
  const n = raw.length;

  function skipString() {
    i++; // opening quote
    while (i < n) {
      if (raw[i] === '\\') { i += 2; continue; }
      if (raw[i] === '"') { i++; return; }
      i++;
    }
  }

  while (i < n) {
    const ch = raw[i];
    if (ch === '"') {
      const start = i;
      skipString();
      const strContent = raw.slice(start + 1, i - 1);
      let j = i;
      while (j < n && /\s/.test(raw[j])) j++;
      if (raw[j] === ':') {
        const top = stack[stack.length - 1];
        if (top.has(strContent)) {
          dups.push({ key: strContent, index: start });
        } else {
          top.add(strContent);
        }
      }
      continue;
    }
    if (ch === '{') { stack.push(new Set()); i++; continue; }
    if (ch === '}') { stack.pop(); i++; continue; }
    i++;
  }
  return dups;
}

/**
 * Extracts every i18n key reference from a template/JS source file.
 * Returns { exact: Set<string>, patterns: [{prefix, suffix}] } — `patterns`
 * covers dynamically-built keys (e.g. `about.<%= faq.key %>Q` in .ejs files,
 * or `` `error.${statusCode}Message` `` in .js files) that can't be resolved
 * to a single literal string; a locale key is "referenced" if it matches any
 * exact string OR starts with `prefix` and ends with `suffix` for any pattern.
 */
export function extractKeyReferences(source, isEjs) {
  const exact = new Set();
  const patterns = [];

  if (isEjs) {
    const attrGroup = I18N_ATTRS.map((a) => a.replace(/-/g, '\\-')).join('|');
    const re = new RegExp(`(?:${attrGroup})\\s*=\\s*"([^"]*)"`, 'g');
    let m;
    while ((m = re.exec(source))) {
      const value = m[1];
      if (value.includes('<%')) {
        // Dynamic EJS expression inside the attribute value — split on the
        // first `<%...%>` block into a static prefix/suffix wildcard. A
        // fully-dynamic value (e.g. `<%= messageKey %>` alone) yields an
        // empty prefix AND suffix, which would match every locale key and
        // silently defeat unused-key detection — skip those; the matching
        // JS-side template literal (if any) provides the real constraint.
        const parts = value.split(/<%[-=]?[\s\S]*?%>/);
        const prefix = parts[0] || '';
        const suffix = parts[parts.length - 1] || '';
        if (prefix || suffix) patterns.push({ prefix, suffix });
      } else if (value) {
        exact.add(value);
      }
    }
  } else {
    // JS/JSON source: look for backtick template literals that start with a
    // known i18n namespace immediately followed by a dot (narrow on purpose,
    // so ordinary template literals — URLs, log lines — are never matched).
    const nsGroup = KNOWN_NAMESPACES.join('|');
    const re = new RegExp('`((?:' + nsGroup + ')\\.[^`]*)`', 'g');
    let m;
    while ((m = re.exec(source))) {
      const literal = m[1];
      if (literal.includes('${')) {
        const parts = literal.split(/\$\{[^}]*\}/);
        patterns.push({ prefix: parts[0] || '', suffix: parts[parts.length - 1] || '' });
      } else {
        exact.add(literal);
      }
    }
    // Also catch plain string-literal key references, e.g. titleKey: 'home.pageTitle'
    const strGroup = KNOWN_NAMESPACES.join('|');
    const strRe = new RegExp(`['"]((?:${strGroup})\\.[a-zA-Z0-9_.]+)['"]`, 'g');
    while ((m = strRe.exec(source))) exact.add(m[1]);
    // Also catch direct JS property-access chains, e.g. locale.common.close
    // (used where the namespace/key are read as object properties rather
    // than looked up by a string key).
    const propRe = new RegExp(`\\.((?:${strGroup})(?:\\.[a-zA-Z0-9_]+)+)\\b`, 'g');
    while ((m = propRe.exec(source))) exact.add(m[1]);
  }

  return { exact, patterns };
}

export function keyMatchesAnyPattern(key, patterns) {
  return patterns.some((p) => key.startsWith(p.prefix) && key.endsWith(p.suffix) && key.length >= p.prefix.length + p.suffix.length);
}
