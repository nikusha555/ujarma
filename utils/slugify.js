/**
 * utils/slugify.js — Georgian & Latin Text → URL Slug
 * =====================================================
 * Transliterates Georgian Mkhedruli script to Latin
 * using the standard Georgian national romanisation,
 * then normalises the result to a clean URL-safe slug.
 *
 * Usage:
 *   import { slugify } from '../utils/slugify.js';
 *   slugify('უჯარმის ციხე'); // → 'ujarmis-tsikhe'
 */

// ── Georgian Mkhedruli → Latin transliteration table ──
const GEO_TO_LATIN = {
  'ა': 'a',  'ბ': 'b',  'გ': 'g',  'დ': 'd',  'ე': 'e',
  'ვ': 'v',  'ზ': 'z',  'თ': 'th', 'ი': 'i',  'კ': 'k',
  'ლ': 'l',  'მ': 'm',  'ნ': 'n',  'ო': 'o',  'პ': 'p',
  'ჟ': 'zh', 'რ': 'r',  'ს': 's',  'ტ': 't',  'უ': 'u',
  'ფ': 'f',  'ქ': 'k',  'ღ': 'gh', 'ყ': 'q',  'შ': 'sh',
  'ჩ': 'ch', 'ც': 'ts', 'ძ': 'dz', 'წ': 'ts', 'ჭ': 'ch',
  'ხ': 'kh', 'ჯ': 'j',  'ჰ': 'h',
};

/**
 * Convert any string (Georgian, Latin, or mixed) to a URL slug.
 *
 * Steps:
 *  1. Replace each Georgian character with its Latin equivalent.
 *  2. Lowercase the entire string.
 *  3. Strip Unicode diacritics (accents) from Latin characters.
 *  4. Remove any character that is not alphanumeric, a space, or a hyphen.
 *  5. Trim leading/trailing whitespace.
 *  6. Replace runs of whitespace with a single hyphen.
 *  7. Collapse multiple consecutive hyphens into one.
 *
 * @param {string} text
 * @returns {string}
 */
export const slugify = (text = '') =>
  text
    .split('')
    .map((ch) => GEO_TO_LATIN[ch] ?? ch)
    .join('')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // strip diacritics
    .replace(/[^a-z0-9\s-]/g, '')      // allow only alphanumeric, space, hyphen
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-');
