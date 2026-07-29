/**
 * public/js/i18n.js — Ujarma Village Website
 * =============================================
 * Client-side internationalisation engine.
 *
 * Strategy
 * ─────────
 * • Georgian content is rendered server-side (SEO baseline).
 * • All translatable elements carry a `data-i18n="key"` attribute
 *   (or data-i18n-html for HTML content, data-i18n-placeholder,
 *    data-i18n-aria-label, data-i18n-title, data-i18n-date).
 * • data-i18n-date="<ISO date>" [data-i18n-date-style="full|long|short"]
 *   reformats a server-rendered date with Intl.DateTimeFormat in the
 *   active language's locale, so dates (e.g. news published dates) also
 *   switch instantly instead of staying frozen in the SSR language.
 * • On every page load this script reads the user's preferred language
 *   from localStorage and applies translations instantly.
 * • switchLanguage(lang) updates localStorage, a cookie (for consistency),
 *   and re-applies translations — zero full-page reload required.
 * • On first visit the browser's navigator.language is used to auto-detect
 *   Georgian, English, or Russian; any other language defaults to Georgian.
 *
 * Public API (attached to window)
 * ────────────────────────────────
 *   window.switchLanguage(lang)   — switch to 'ka' | 'en' | 'ru'
 *   window.currentLang()          — returns the active language code
 */

(function () {
  'use strict';

  /* ─── Constants ──────────────────────────────────────────── */
  var STORAGE_KEY    = 'ujarma_lang';
  var COOKIE_KEY     = 'ujarma_lang';
  var SUPPORTED      = ['ka', 'en', 'ru'];
  var DEFAULT_LANG   = 'ka';

  /* BCP-47 locale tags used for Intl.DateTimeFormat (data-i18n-date). */
  var INTL_LOCALE = { ka: 'ka-GE', en: 'en-US', ru: 'ru-RU' };

  /* Named date-format presets referenced via data-i18n-date-style. */
  var DATE_STYLES = {
    full:  { weekday: 'long', day: 'numeric', month: 'long',  year: 'numeric' },
    long:  { day: 'numeric', month: 'long',  year: 'numeric' },
    short: { day: 'numeric', month: 'short', year: 'numeric' },
  };

  /* Tracks the language currently reflected in the DOM, so repeated
     clicks on an already-active language button skip all translation
     work instead of re-querying and rewriting the entire document. */
  var appliedLang = null;

  /* ─── Retrieve all locale data embedded by the server ───── */
  var allLocales = (typeof window.__i18n !== 'undefined') ? window.__i18n : {};

  /* ─── Helpers ─────────────────────────────────────────────── */

  /** Deep-read a dot-separated key from the locale object. */
  function t(lang, key) {
    var locale = allLocales[lang] || allLocales[DEFAULT_LANG] || {};
    var parts  = key.split('.');
    var value  = locale;
    for (var i = 0; i < parts.length; i++) {
      if (value == null) return key;
      value = value[parts[i]];
    }
    return (typeof value === 'string') ? value : key;
  }

  /** Write a cookie so server-side code can read language on next request. */
  function setCookie(lang) {
    var expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);
    document.cookie =
      COOKIE_KEY + '=' + lang +
      '; expires=' + expires.toUTCString() +
      '; path=/; SameSite=Lax';
  }

  /** Detect the best language from browser preference. */
  function detectBrowserLang() {
    var nav  = (navigator.language || navigator.userLanguage || '').toLowerCase();
    if (nav.startsWith('ka')) return 'ka';
    if (nav.startsWith('en')) return 'en';
    if (nav.startsWith('ru')) return 'ru';
    return DEFAULT_LANG;
  }

  /** Return the current active language. */
  function getActiveLang() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (stored && SUPPORTED.indexOf(stored) !== -1) return stored;
    } catch (e) {}
    return detectBrowserLang();
  }

  /* ─── DOM application ─────────────────────────────────────── */

  /**
   * Apply translations to every data-i18n-* element in the document.
   * Called once on load and again whenever the user switches language.
   */
  function applyTranslations(lang) {
    if (SUPPORTED.indexOf(lang) === -1) lang = DEFAULT_LANG;

    /* data-i18n  → textContent */
    var els = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < els.length; i++) {
      var key = els[i].getAttribute('data-i18n');
      els[i].textContent = t(lang, key);
    }

    /* data-i18n-html  → innerHTML (for strings containing <br> etc.) */
    var htmlEls = document.querySelectorAll('[data-i18n-html]');
    for (var j = 0; j < htmlEls.length; j++) {
      var hKey = htmlEls[j].getAttribute('data-i18n-html');
      htmlEls[j].innerHTML = t(lang, hKey);
    }

    /* data-i18n-placeholder  → placeholder attribute */
    var phEls = document.querySelectorAll('[data-i18n-placeholder]');
    for (var k = 0; k < phEls.length; k++) {
      var phKey = phEls[k].getAttribute('data-i18n-placeholder');
      phEls[k].setAttribute('placeholder', t(lang, phKey));
    }

    /* data-i18n-aria-label  → aria-label attribute */
    var ariaEls = document.querySelectorAll('[data-i18n-aria-label]');
    for (var m = 0; m < ariaEls.length; m++) {
      var ariaKey = ariaEls[m].getAttribute('data-i18n-aria-label');
      ariaEls[m].setAttribute('aria-label', t(lang, ariaKey));
    }

    /* data-i18n-title  → title attribute */
    var titleEls = document.querySelectorAll('[data-i18n-title]');
    for (var n = 0; n < titleEls.length; n++) {
      var titleKey = titleEls[n].getAttribute('data-i18n-title');
      titleEls[n].setAttribute('title', t(lang, titleKey));
    }

    /* data-i18n-date="<ISO date>" [data-i18n-date-style]  → textContent,
       reformatted with Intl.DateTimeFormat in the active locale. Dates are
       rendered server-side in Georgian; this keeps them in sync on switch. */
    var dateEls = document.querySelectorAll('[data-i18n-date]');
    for (var p = 0; p < dateEls.length; p++) {
      var iso    = dateEls[p].getAttribute('data-i18n-date');
      var style  = dateEls[p].getAttribute('data-i18n-date-style') || 'long';
      var parsed = new Date(iso);
      if (!isNaN(parsed.getTime())) {
        try {
          dateEls[p].textContent = new Intl.DateTimeFormat(
            INTL_LOCALE[lang] || INTL_LOCALE[DEFAULT_LANG],
            DATE_STYLES[style] || DATE_STYLES.long
          ).format(parsed);
        } catch (e) { /* unsupported locale/options — leave SSR value as-is */ }
      }
    }

    /* Update <html lang="…"> */
    document.documentElement.lang = lang;

    /* Update active state on language switcher buttons */
    var btns = document.querySelectorAll('.lang-btn');
    for (var b = 0; b < btns.length; b++) {
      var btnLang = btns[b].getAttribute('data-lang');
      btns[b].classList.toggle('lang-btn--active', btnLang === lang);
      btns[b].setAttribute('aria-pressed', btnLang === lang ? 'true' : 'false');
    }

    appliedLang = lang;
  }

  /* ─── Public switchLanguage ───────────────────────────────── */

  window.switchLanguage = function (lang) {
    if (SUPPORTED.indexOf(lang) === -1) return;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
    setCookie(lang);
    /* Skip the DOM pass entirely when the language is already active —
       avoids unnecessary re-renders on a redundant click. */
    if (lang !== appliedLang) applyTranslations(lang);
    /* Close any open Bootstrap dropdown */
    var openDropdown = document.querySelector('.lang-dropdown.show');
    if (openDropdown) openDropdown.classList.remove('show');
  };

  window.currentLang = function () {
    return getActiveLang();
  };

  /* ─── Language switcher button wiring ─────────────────────── */

  /**
   * Bind click handlers to every [data-lang] language switcher button via
   * addEventListener rather than inline onclick="" attributes. The site's
   * CSP (helmet) sets script-src-attr 'none' by default, which silently
   * blocks inline event handler attributes even though script-src itself
   * allows 'unsafe-inline' — addEventListener is unaffected by that
   * directive, so this is the CSP-compliant way to wire the buttons.
   */
  function bindLangButtons() {
    var btns = document.querySelectorAll('[data-lang]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', function () {
        window.switchLanguage(this.getAttribute('data-lang'));
      });
    }
  }

  /* ─── Initialise on DOMContentLoaded ─────────────────────── */

  function init() {
    var lang = getActiveLang();
    /* Always apply on load so the language switcher UI reflects the state,
       and non-default languages get their translations applied. */
    applyTranslations(lang);
    bindLangButtons();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

}());
