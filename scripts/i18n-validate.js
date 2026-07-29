/**
 * scripts/i18n-validate.js
 * ─────────────────────────────────────────────────────────────────────────────
 * i18n health check for ka.json / en.json / ru.json + the views/ that consume
 * them. Run before every deploy — a non-zero exit means something is broken.
 *
 * Checks:
 *   1. Missing keys   — a key exists in one locale but not another.
 *   2. Duplicate keys — the same key appears twice in one JSON file (JSON.parse
 *                       silently keeps only the last one, so this is otherwise
 *                       invisible).
 *   3. Untranslated   — a key's value is still the sync-tool's
 *                       "[UNTRANSLATED] …" placeholder (see i18n-sync.js).
 *   4. Unused keys    — present in the locale files but never referenced by
 *                       any data-i18n* attribute or i18n key literal (warning
 *                       only — dynamic keys built from EJS/JS expressions are
 *                       matched via prefix/suffix patterns, but the matcher is
 *                       a heuristic, so this list can contain false positives).
 *   5. Hardcoded text — Georgian text sitting in template markup outside of
 *                       any data-i18n-covered element (warning only — a
 *                       heuristic string scan, not a full HTML/EJS parser).
 *
 * Usage:
 *   node scripts/i18n-validate.js            fail only on 1–3 (CI-safe default)
 *   node scripts/i18n-validate.js --strict    also fail on 4–5
 * ─────────────────────────────────────────────────────────────────────────────
 */

import fs from 'fs';
import path from 'path';
import {
  ROOT, LANGS, SOURCE_LANG, listViewFiles, listSourceJsFiles,
  readLocale, readLocaleRaw, flatten, findDuplicateKeys,
  extractKeyReferences, keyMatchesAnyPattern,
} from './i18n-lib.js';

const STRICT = process.argv.includes('--strict');
const UNTRANSLATED_MARK = '[UNTRANSLATED]';

let failed = false;
const warn = (msg) => console.log(`  \x1b[33m⚠\x1b[0m  ${msg}`);
const fail = (msg) => { console.log(`  \x1b[31m✗\x1b[0m  ${msg}`); failed = true; };
const ok   = (msg) => console.log(`  \x1b[32m✓\x1b[0m  ${msg}`);

console.log('\n┌─ i18n validate ─────────────────────────────────────────┐\n');

// ── 1 & 2: load locales, flatten, check duplicates ─────────────────────────
const flat = {};
const keySets = {};
for (const lang of LANGS) {
  const raw = readLocaleRaw(lang);
  const dups = findDuplicateKeys(raw);
  if (dups.length) {
    for (const d of dups) fail(`Duplicate key "${d.key}" in locales/${lang}.json`);
  } else {
    ok(`No duplicate keys in locales/${lang}.json`);
  }
  flat[lang] = flatten(readLocale(lang));
  keySets[lang] = new Set(flat[lang].keys());
}

// ── Missing keys across locales ─────────────────────────────────────────────
const unionKeys = new Set();
for (const lang of LANGS) for (const k of keySets[lang]) unionKeys.add(k);

let missingFound = false;
for (const lang of LANGS) {
  const missing = [...unionKeys].filter((k) => !keySets[lang].has(k));
  if (missing.length) {
    missingFound = true;
    for (const k of missing) fail(`Missing key "${k}" in locales/${lang}.json`);
  }
}
if (!missingFound) ok(`All ${unionKeys.size} keys present in all ${LANGS.length} locales`);

// ── 3: untranslated placeholders left by i18n-sync.js ───────────────────────
let untranslatedFound = false;
for (const lang of LANGS) {
  for (const [key, value] of flat[lang]) {
    if (typeof value === 'string' && value.startsWith(UNTRANSLATED_MARK)) {
      untranslatedFound = true;
      fail(`Untranslated placeholder at "${lang}.${key}" — ${value}`);
    }
  }
}
if (!untranslatedFound) ok('No untranslated placeholders left by i18n-sync.js');

// ── 4: unused keys ───────────────────────────────────────────────────────────
const viewFiles = listViewFiles();
const jsFiles    = listSourceJsFiles();

const usedExact = new Set();
const usedPatterns = [];
for (const file of viewFiles) {
  const { exact, patterns } = extractKeyReferences(fs.readFileSync(file, 'utf8'), true);
  for (const k of exact) usedExact.add(k);
  usedPatterns.push(...patterns);
}
for (const file of jsFiles) {
  const { exact, patterns } = extractKeyReferences(fs.readFileSync(file, 'utf8'), false);
  for (const k of exact) usedExact.add(k);
  usedPatterns.push(...patterns);
}

const unused = [...unionKeys].filter(
  (k) => !usedExact.has(k) && !keyMatchesAnyPattern(k, usedPatterns)
);
if (unused.length) {
  const report = STRICT ? fail : warn;
  for (const k of unused) report(`Unused key "${k}" — not referenced by any template or controller`);
} else {
  ok('No unused keys');
}

// ── 5: hardcoded Georgian text heuristic ────────────────────────────────────
const GEORGIAN = /[Ⴀ-ჿ]/;
let hardcodedHits = 0;
for (const file of viewFiles) {
  const original = fs.readFileSync(file, 'utf8');
  // Blank out (not delete, to keep line numbers accurate) content that's
  // already covered by an i18n mechanism or isn't renderable text.
  let masked = original
    .replace(/<%[-=]?[\s\S]*?%>/g, (m) => m.replace(/[^\n]/g, ' '))       // EJS tags
    .replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '));        // HTML comments
  // Blank out elements whose opening tag carries a data-i18n* attribute.
  masked = masked.replace(
    /<([a-zA-Z0-9]+)((?:(?!>|data-i18n)[\s\S])*data-i18n[\s\S]*?)>([\s\S]*?)<\/\1>/g,
    (m) => m.replace(/[^\n]/g, ' ')
  );

  const lines = masked.split('\n');
  lines.forEach((line, idx) => {
    if (GEORGIAN.test(line)) {
      hardcodedHits++;
      const report = STRICT ? fail : warn;
      const relPath = path.relative(ROOT, file).replace(/\\/g, '/');
      report(`Possible hardcoded text — ${relPath}:${idx + 1}: ${line.trim().slice(0, 80)}`);
    }
  });
}
if (hardcodedHits === 0) ok('No hardcoded Georgian text found outside data-i18n elements');

console.log('\n└─────────────────────────────────────────────────────────┘\n');

if (failed) {
  console.log(`i18n validation FAILED.${STRICT ? '' : ' (run with --strict to also fail on warnings)'}\n`);
  process.exit(1);
} else {
  console.log('i18n validation passed.\n');
}
