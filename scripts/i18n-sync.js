/**
 * scripts/i18n-sync.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Automatic translation-key maintenance (item 3 of the i18n production-
 * readiness work): scans every view for data-i18n* keys that don't exist yet
 * in locales/ka.json, seeds ka.json with the Georgian text/attribute already
 * sitting in the template (ka is the server-rendered source of truth), and
 * scaffolds a "[UNTRANSLATED] <ka text>" placeholder into en.json / ru.json
 * for that key (and for any other key missing from either of them) so the
 * three locale files can never silently drift out of sync — a developer who
 * adds `data-i18n="foo.bar"` to a template and forgets to translate it gets a
 * visible placeholder instead of nothing.
 *
 * This only handles LITERAL keys (`data-i18n="foo.bar"`). Dynamically built
 * keys (`data-i18n="about.<%= faq.key %>Q"`, `` `error.${x}Message` ``) must
 * still be added by hand — there's no static string to seed a value from.
 *
 * Run this after adding new translatable markup, then fill in the
 * "[UNTRANSLATED]" placeholders and re-run `node scripts/i18n-validate.js`.
 *
 * Usage:
 *   node scripts/i18n-sync.js            apply changes
 *   node scripts/i18n-sync.js --dry-run  report only, write nothing
 * ─────────────────────────────────────────────────────────────────────────────
 */

import fs from 'fs';
import path from 'path';
import {
  ROOT, LANGS, SOURCE_LANG, listViewFiles,
  readLocale, writeLocale, flatten, setAtPath, getAtPath,
} from './i18n-lib.js';

const DRY_RUN = process.argv.includes('--dry-run');
const UNTRANSLATED_MARK = '[UNTRANSLATED]';

const ATTR_TO_HTML_ATTR = {
  'data-i18n-placeholder': 'placeholder',
  'data-i18n-aria-label':  'aria-label',
  'data-i18n-title':       'title',
};

/** Collapse internal runs of whitespace and trim — keeps seeded values tidy
 *  without altering meaning. */
const clean = (s) => s.replace(/\s+/g, ' ').trim();

/** Best-effort extraction of the seed value for a literal data-i18n* key. */
function extractSeedValue(source, attr, key) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  if (attr === 'data-i18n' || attr === 'data-i18n-html') {
    const re = new RegExp(
      `<([a-zA-Z0-9]+)([^>]*${attr}="${escapedKey}"[^>]*)>([\\s\\S]*?)<\\/\\1>`
    );
    const m = source.match(re);
    if (m) return clean(m[3]);
    return null;
  }

  // Attribute-target variants: read the sibling HTML attribute on the same tag.
  const htmlAttr = ATTR_TO_HTML_ATTR[attr];
  const tagRe = new RegExp(`<[a-zA-Z0-9]+[^>]*${attr}="${escapedKey}"[^>]*>`);
  const tagMatch = source.match(tagRe);
  if (!tagMatch) return null;
  const attrRe = new RegExp(`${htmlAttr}="([^"]*)"`);
  const attrMatch = tagMatch[0].match(attrRe);
  return attrMatch ? clean(attrMatch[1]) : null;
}

const I18N_KEY_ATTRS = ['data-i18n', 'data-i18n-html', 'data-i18n-placeholder', 'data-i18n-aria-label', 'data-i18n-title'];

function findLiteralKeyRefs() {
  const found = new Map(); // key -> seed value (first match wins)
  for (const file of listViewFiles()) {
    const source = fs.readFileSync(file, 'utf8');
    for (const attr of I18N_KEY_ATTRS) {
      const re = new RegExp(`${attr}="([a-zA-Z0-9_.]+)"`, 'g');
      let m;
      while ((m = re.exec(source))) {
        const key = m[1];
        if (found.has(key)) continue;
        found.set(key, extractSeedValue(source, attr, key));
      }
    }
  }
  return found;
}

console.log(`\n┌─ i18n sync ${DRY_RUN ? '(dry run) ' : ''}────────────────────────────────────┐\n`);

const literalRefs = findLiteralKeyRefs();
const locales = {};
for (const lang of LANGS) locales[lang] = readLocale(lang);
const flatKa = flatten(locales[SOURCE_LANG]);

let addedToKa = 0;
let addedPlaceholders = 0;

for (const [key, seedValue] of literalRefs) {
  if (!flatKa.has(key)) {
    const value = seedValue || '[NEEDS_CONTENT]';
    setAtPath(locales[SOURCE_LANG], key, value);
    flatKa.set(key, value);
    addedToKa++;
    console.log(`  + ka.${key} = "${value}"`);
  }
}

// Now make sure every key that exists in ANY locale exists in ALL locales.
const unionKeys = new Set();
for (const lang of LANGS) for (const k of flatten(locales[lang]).keys()) unionKeys.add(k);
for (const k of flatKa.keys()) unionKeys.add(k);

for (const lang of LANGS) {
  const flatLang = flatten(locales[lang]);
  for (const key of unionKeys) {
    if (!flatLang.has(key)) {
      const kaValue = getAtPath(locales[SOURCE_LANG], key);
      const placeholder = lang === SOURCE_LANG
        ? (kaValue ?? '[NEEDS_CONTENT]')
        : `${UNTRANSLATED_MARK} ${kaValue ?? key}`;
      setAtPath(locales[lang], key, placeholder);
      addedPlaceholders++;
      console.log(`  + ${lang}.${key} = "${placeholder}"`);
    }
  }
}

if (addedToKa === 0 && addedPlaceholders === 0) {
  console.log('  Nothing to do — every referenced key already exists in all locales.\n');
} else if (!DRY_RUN) {
  for (const lang of LANGS) writeLocale(lang, locales[lang]);
  console.log(`\n  Wrote ${addedToKa} new key(s) + ${addedPlaceholders} placeholder(s) across locales/*.json.`);
  console.log('  Run `node scripts/i18n-validate.js` and fill in any "[UNTRANSLATED]" values.\n');
} else {
  console.log(`\n  Dry run — ${addedToKa} new key(s) + ${addedPlaceholders} placeholder(s) would be written.\n`);
}

console.log('└─────────────────────────────────────────────────────────┘\n');
