# Icon System — Ujarma Official Village Website

> **Maintenance rule:** Update this file whenever an icon is added, changed, or the icon library is upgraded.

---

## Library

**Lucide Icons** — https://lucide.dev

| Property | Value |
|---|---|
| **Version** | Latest (pinned via `@latest` CDN tag) |
| **CDN** | `https://cdn.jsdelivr.net/npm/lucide@latest/dist/umd/lucide.min.js` |
| **Licence** | ISC (open source) |
| **Rendering** | SVG injection — no font files, no network round-trips per glyph |
| **Style** | Outlined, stroke-based, `stroke="currentColor"` — inherits CSS `color` |

Bootstrap Icons was removed entirely. No `bi bi-*` class names remain in the project.

---

## How It Works

### 1. Markup

Place an `<i>` tag with the `data-lucide` attribute anywhere in a template:

```html
<i data-lucide="icon-name"></i>
```

### 2. Initialisation

`lucide.createIcons()` is called in `public/js/main.js` at the top of the IIFE, immediately after the page is parsed. It scans the DOM for every `[data-lucide]` element and replaces it with an inline `<svg>`.

```js
// public/js/main.js
if (typeof lucide !== 'undefined') {
  lucide.createIcons();
}
```

The Lucide script is loaded from CDN **before** `main.js` in both layouts:

- `views/layouts/main.ejs` — public pages
- `views/layouts/admin.ejs` — admin panel
- `views/admin/login.ejs` — standalone login page (has its own inline `createIcons()` call)

### 3. Result

After injection, `<i data-lucide="newspaper">` becomes:

```html
<svg
  xmlns="http://www.w3.org/2000/svg"
  class="lucide lucide-newspaper"
  viewBox="0 0 24 24"
  width="24" height="24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <!-- paths -->
</svg>
```

---

## Icon Sizing

Lucide SVGs default to 24×24px. Three sizing patterns are used in this project:

### Pattern A — CSS-controlled containers

Used for: stat cards, empty states, sidebar navigation, contact info blocks.

```html
<!-- Wrap the icon in a container whose CSS specifies size -->
<div class="admin-stat-icon">
  <i data-lucide="newspaper"></i>
</div>
```

`style.css` section `/* 20. Lucide Icon System */` sets `width/height` on `svg.lucide` inside each container.

### Pattern B — Inline icons (`.icon-inline`)

Used for: icons inside text, links, buttons, breadcrumbs.

```html
Read more <i data-lucide="arrow-right" class="icon-inline"></i>
```

`.icon-inline` CSS rule:

```css
.icon-inline {
  display: inline-block;
  vertical-align: -0.1em;
  width:  0.875em;
  height: 0.875em;
}
```

Lucide copies the `class="icon-inline"` from the `<i>` to the generated `<svg>`, so the CSS rule applies automatically.

### Pattern C — Explicit inline style

Used for: one-off sizes that don't fit a reusable class (e.g. fact-card icons on the About page, placeholder icons in gallery grid).

```html
<i data-lucide="landmark" style="width:1.75rem;height:1.75rem;color:var(--color-accent);display:block;"></i>
```

---

## Adding a New Icon

1. **Find the icon name** at https://lucide.dev/icons — the name is the kebab-case string shown below each icon (e.g. `arrow-up-right`).

2. **Add the markup** to the appropriate EJS template:

```html
<i data-lucide="arrow-up-right" class="icon-inline"></i>
```

3. **Choose a sizing pattern** (A, B, or C above).

4. **No additional imports or build steps are required.** `lucide.createIcons()` already handles all `[data-lucide]` elements on the page.

5. **Update this file** if you introduce a new icon for a new feature.

---

## Icon Name Conventions

- All icon names are **kebab-case**, matching Lucide's naming exactly.
- Do **not** use BI class names (`bi-newspaper`) — they no longer work.
- Do **not** add a `class="lucide"` manually — it is injected by `createIcons()`.

---

## Full Icon Map (current usage)

| Location | Purpose | Lucide Name |
|---|---|---|
| Admin sidebar — Dashboard | Navigation item | `layout-dashboard` |
| Admin sidebar — News | Navigation item | `newspaper` |
| Admin sidebar — Attractions | Navigation item | `map-pin` |
| Admin sidebar — Gallery | Navigation item | `images` |
| Admin sidebar — View Website | External link | `external-link` |
| Admin sidebar — Logout | Sign out | `log-out` |
| Admin topbar — Mobile toggle | Hamburger | `menu` |
| Admin topbar — User label | Administrator icon | `user-round` |
| Admin login — Submit button | Sign in | `log-in` |
| Admin login — Back link | Return arrow | `arrow-left` |
| Admin login — Error alert | Warning triangle | `triangle-alert` |
| Dashboard stat — News | Count card | `newspaper` |
| Dashboard stat — Attractions | Count card | `map-pin` |
| Dashboard stat — Gallery | Count card | `images` |
| Dashboard quick-link — News | Action button | `newspaper` |
| Dashboard quick-link — Attractions | Action button | `map-pin` |
| Dashboard quick-link — Gallery | Action button | `images` |
| Dashboard quick-link — Website | Action button | `external-link` |
| Dashboard — Date | Topbar label | `calendar` |
| Admin News/Attractions/Gallery — Add | Disabled button | `plus` |
| Admin News — External link | View on site | `external-link` |
| Admin News — Empty state | Empty indicator | `newspaper` |
| Admin News/Attractions/Gallery — Info | Foundation notice | `info` |
| Admin Attractions — Featured | Star filled | `star` (with fill style) |
| Admin Attractions — Not featured | Star outline | `star` (outline) |
| Admin Attractions — External link | View on site | `external-link` |
| Admin Attractions — Empty state | Empty indicator | `map-pin` |
| Admin Gallery — Upload | Disabled button | `upload` |
| Admin Gallery — Empty state | Empty indicator | `images` |
| Footer nav links | Chevron bullet | `chevron-right` |
| Footer contact — Address | Location | `map-pin` |
| Footer contact — Phone | Telephone | `phone` |
| Footer contact — Email | Email | `mail` |
| Home — News card date | Date label | `calendar` |
| Home — News card read-more | Inline arrow | `arrow-right` |
| Home — News placeholder | Empty state | `newspaper` |
| Home — Attraction card | Card icon | `landmark` |
| Home — Attraction detail link | Inline arrow | `arrow-right` |
| Home — Attraction empty state | Empty indicator | `map-pin` |
| Home — Gallery view-all | Inline arrow | `arrow-right` |
| Home — Gallery overlay | Zoom in | `zoom-in` |
| Home — Gallery placeholder | Empty cell | `image` |
| Home — News section view-all | Inline arrow | `arrow-right` |
| News listing — Card placeholder | Empty state | `newspaper` |
| News listing — Date | Date label | `calendar` |
| News listing — Read-more | Inline arrow | `arrow-right` |
| News listing — Empty state | Empty indicator | `newspaper` |
| News article — Date | Date label | `calendar` |
| News article — Back link | Inline arrow | `arrow-left` |
| Attractions listing — Placeholder | Empty cell | `building-2` |
| Attractions listing — Detail link | Inline arrow | `arrow-right` |
| Attractions listing — Empty state | Empty indicator | `map-pin` |
| Attraction detail — Category | Info sidebar | `tag` |
| Attraction detail — Location | Info sidebar | `map-pin` |
| Attraction detail — Back link | Inline arrow | `arrow-left` |
| Gallery listing — Zoom overlay | Lightbox trigger | `zoom-in` |
| Gallery listing — Empty state | Empty indicator | `images` |
| About — Location fact card | Fact icon | `map-pin` |
| About — Landmark fact card | Fact icon | `landmark` |
| About — Nature fact card | Fact icon | `trees` |
| About — Region fact card | Fact icon | `globe` |
| Contact — Address | Info block | `map-pin` |
| Contact — Phone | Info block | `phone` |
| Contact — Email | Info block | `mail` |
| Contact — Working hours | Info block | `clock` |
| Contact — Success message | Alert icon | `check-circle-2` |
| Contact — Error message | Alert icon | `alert-circle` |
| Contact — Submit button | Send | `send` |
| Error page — Return home | Button icon | `house` |

---

## Upgrading the Library

To pin to a specific version (recommended before production), change the CDN `@latest` tag to a version number in all three places:

- `views/layouts/main.ejs`
- `views/layouts/admin.ejs`
- `views/admin/login.ejs`

```html
<!-- Example: pin to 0.400.0 -->
<script src="https://cdn.jsdelivr.net/npm/lucide@0.400.0/dist/umd/lucide.min.js"></script>
```

Check the Lucide changelog at https://github.com/lucide-icons/lucide/releases before upgrading to verify no icon names were renamed or removed.
