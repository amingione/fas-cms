# Design Consistency Audit Report: fas-cms-fresh

> **Updated:** 2026-03-11 — Full re-audit after theme change.
> **Scope:** All `.astro`, `.tsx`, `.jsx`, `.css`, `.js` files under `src/`, plus `tailwind.config.js`

---

## Executive Summary

The codebase exhibits **significant design inconsistencies** following the recent theme update. Multiple color variants, hardcoded values, and arbitrary Tailwind classes bypass the new theme system. The new theme (`fas-theme2.css`) is **not propagating** because it was added on top of the old system instead of replacing it — resulting in two competing `:root` blocks, a mismatched Tailwind config, and 8+ variants of the brand red in active use.

---

## 1. Theme Source of Truth

| Token Category         | Files That Define It                                                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Fonts (CSS vars)**   | `src/styles/fas-theme.css` `:root` lines 13–22 (active), `src/styles/fas-theme2.css` `:root` lines 27–31 (also loaded — **conflicts**)                                         |
| **Font sizes**         | `tailwind.config.js` `fontSize` block                                                                                                                                          |
| **Font weights**       | Tailwind defaults + `--font-weight-medium/normal` in `global.css` lines 144–145                                                                                                |
| **Line heights**       | Embedded inside `tailwind.config.js` fontSize tuples only                                                                                                                      |
| **Colors**             | Fragmented across **4 files**: `fas-theme.css` `:root`, `fas-theme2.css` `:root`, `global.css` second `:root` (line 103), `tailwind.config.js` `colors` block                  |
| **Spacing / layout**   | `fas-theme.css` (`--container-pad-*`, `--max-w`), `global.css` (`--container-max`, `--container-gutter`), `fas-theme2.css` (`--max-w`, `--nav-h`) — **three separate systems** |
| **Border radius**      | `tailwind.config.js` `borderRadius` block                                                                                                                                      |
| **Shadows**            | `tailwind.config.js` `boxShadow` block                                                                                                                                         |
| **Borders**            | `fas-theme.css` / `fas-theme2.css` `--border-subtle/default/strong`                                                                                                            |
| **Dark/light mode**    | `global.css` `.dark {}` block (line 170) — manually toggled class, not a system-wide mode                                                                                      |
| **CSS variables**      | `fas-theme.css` (brand/layout tokens), `fas-theme2.css` (duplicate brand tokens, homepage tokens), `global.css` (Tailwind shadcn tokens, color aliases, container vars)        |
| **Component variants** | `global.css` `.btn-glass`, `.btn-primary`, `.btn-glass.*` — all in one 60KB file                                                                                               |

---

## 2. Inconsistencies Found

### 🔴 Critical

---

#### [C-01] Tailwind `color.primary` ≠ CSS `--color-primary` ≠ CSS `--text-primary`

- **Severity:** Critical
- **Category:** CSS variable mismatch / duplicate token
- **Files:** `tailwind.config.js:58`, `src/styles/fas-theme.css:4`, `src/styles/fas-theme2.css:18`, `src/styles/global.css:105`

```js
// tailwind.config.js:58
primary: '#ea1d26',   // Tailwind color — used by bg-primary, text-primary utilities

// fas-theme.css:4
--color-primary: #c41218;  // CSS var used by var() calls and .text-primary utility class

// fas-theme2.css:18 (the new theme)
--text-primary: #f2efea;   // THIS IS TEXT COLOR, NOT THE BRAND RED
```

Three completely different things share the name "primary": a Tailwind utility color (`#ea1d26`), a brand red CSS var (`#c41218`), and a foreground text color (`#f2efea`). Any component using `text-primary` will get whichever wins the cascade.

**Fix:** Rename `--text-primary` to `--text-base` in `fas-theme2.css`, and align `tailwind.config.js primary` to `#c41218`.

---

#### [C-02] `fas-theme2.css` loaded at layout level alongside `global.css` / `fas-theme.css` — double `:root` collision

- **Severity:** Critical
- **Category:** CSS variable mismatch / local override
- **Files:** `src/layouts/BaseLayout.astro:2-3`, `src/components/homepage/PowerPackages.astro:2`

```astro
// BaseLayout.astro
import '../styles/global.css';       // → imports fas-theme.css inside
import '../styles/fas-theme2.css';   // second full :root block loaded after
```

`global.css` already `@import`s `fas-theme.css`. Then `BaseLayout.astro` also directly imports `fas-theme2.css` as a second `:root` block. Both files define `--red`, `--font-brand`, `--font-display`, `--font-body`, `--bg-base`, `--bg-surface`, `--bg-elevated`, `--text-primary`, `--text-secondary`, `--border-*`, `--ease-*`, `--dur-*`, `--max-w`, `--nav-h` — all as plain `:root` declarations. The last one wins, but the order is determined by Astro's import bundling, not explicit cascade.

**Fix:** Delete `fas-theme.css`, keep only `fas-theme2.css` as the single token source; update `global.css` to `@import './fas-theme2.css'`; remove the separate import in `BaseLayout.astro`.

---

#### [C-03] `tailwind.config.js` has syntax bug — three broken color values

- **Severity:** Critical
- **Category:** Tailwind mismatch / hardcoded value
- **File:** `tailwind.config.js:63,68,69`

```js
background: '#121212)',     // ← stray ) makes this invalid CSS
neutral: { ...colors.neutral, 900: '#121212)' },  // same bug
zinc: { ...colors.zinc, 900: '#121212)' }         // same bug
```

These are syntactically invalid CSS color values. Tailwind emits `#121212)` literally. Browsers reject it — any utility using `bg-background`, `bg-neutral-900`, or `bg-zinc-900` renders **no background at all**, causing visible holes in the dark theme.

**Fix:** Remove the `)` from all three values.

---

#### [C-04] `font-body` Tailwind utility ≠ `--font-body` CSS variable — two different fonts

- **Severity:** Critical
- **Category:** Tailwind mismatch
- **Files:** `tailwind.config.js:85`, `src/styles/fas-theme.css:17`, `src/styles/fas-theme2.css:31`

```js
// tailwind.config.js:85
body: ['American Captain', 'sans-serif'],  // Tailwind: font-body = American Captain

// fas-theme.css:17 & fas-theme2.css:31
--font-body: 'Inter', system-ui, sans-serif;  // CSS var: --font-body = Inter
```

Using the Tailwind class `font-body` loads **American Captain** (a display typeface). Using `var(--font-body)` or the `.font-body` CSS utility class loads **Inter**. The global `body { font-family: var(--font-body); }` rule sets the base body font to Inter. Any component adding `font-body` as a Tailwind class overrides that with American Captain, causing unexpected caps-heavy typefaces on body copy.

**Fix:** Rename Tailwind `fontFamily.body` key to `fontFamily.american-captain`.

---

#### [C-05] Primary red has 8+ hardcoded variants across the codebase

- **Severity:** Critical
- **Category:** Hardcoded value / stale legacy style / duplicate token

| Value     | Occurrences | File examples                                                        |
| --------- | ----------- | -------------------------------------------------------------------- |
| `#ea1d26` | 18          | `tailwind.config.js`, `HellcatBanner.astro`                          |
| `#c41218` | 37          | `fas-theme.css`, `fas-header.astro`, `ProductCardShowcase.astro`     |
| `#c91820` | 8           | `tailwind.config.js` (`primary-hover`)                               |
| `#d11219` | 8           | `global.css` (sidebar), `accountdashboard.astro`, `BlogSidebar.tsx`  |
| `#d73a40` | 6           | `ProductCardShowcase.astro` (text labels)                            |
| `#dc2626` | 14          | `CheckoutForm.tsx` (Stripe `colorPrimary`)                           |
| `#fb3636` | 7           | `FilterPanel.tsx`, `FilterPanelMobile.tsx`, `ShopSidebarFilters.tsx` |
| `#e01420` | 3           | `fas-theme.css` (`--red-hover`)                                      |

**Fix:** All reds must resolve to `var(--red)` or `var(--color-primary)`. Define one canonical value, replace all instances.

---

### 🟠 High

---

#### [H-01] `--primary` defined twice in `global.css`

- **Severity:** High
- **Category:** Duplicate token
- **File:** `global.css:131` and `global.css:178`

```css
--primary: #c41218; /* Line 131 - first :root block */
--primary: #c41218; /* Line 178 - .dark block */
```

Both are the same value now, but structurally defined in two places. If one changes during the next theme update, the other won't.

---

#### [H-02] `oklch` values mixed with hex in the same `:root` block — Tailwind v3 does not support oklch

- **Severity:** High
- **Category:** CSS variable mismatch / stale legacy style
- **File:** `global.css:128-163` (the shadcn token block)

```css
--card-foreground: oklch(0.145 0 0);
--popover: oklch(1 0 0);
--sidebar: oklch(0.985 0 0);
```

This codebase uses **Tailwind v3**, which does not process `oklch()` natively. These are copy-pasted shadcn/ui tokens designed for Tailwind v4. The `.dark {}` block also has `--popover: oklch(73.481% 0.00008 271.152)` — 73% lightness, effectively a light gray used as a dark-mode popover background.

---

#### [H-03] `CheckoutForm.tsx` hardcodes Stripe appearance with a 4th red variant

- **Severity:** High
- **Category:** Hardcoded value / local override
- **File:** `src/components/checkout/CheckoutForm.tsx:1100-1104`

```tsx
colorPrimary: '#dc2626',       // Tailwind red-600 — NOT the brand red (#c41218)
colorBackground: '#0f0f0f',
colorText: '#ffffff',
// Line 960:
style={{ color: '#34d399' }}   // success green — hardcoded
```

---

#### [H-04] `TruckGallery.astro` uses rogue `Nunito` font

- **Severity:** High
- **Category:** Hardcoded value / stale legacy style
- **File:** `src/components/storefront/TruckGallery.astro:119`

```css
font-family: Nunito, sans-serif;
```

`Nunito` is not part of the design system, not defined in `@font-face`, not in `tailwind.config.js`. Falls through to a browser default.

---

#### [H-05] `components.css` is nearly empty — misleading file

- **Severity:** High
- **Category:** Dead/misleading file
- **File:** `src/styles/components.css`

```css
.hero-banner {
  position: relative;
  width: 100%;
  overflow: hidden;
  height: 600px;
}
```

A file named `components.css` containing one rule. All button, card, form, nav, table component styles live inside the 60KB `global.css`, causing confusion about where new component styles belong.

---

#### [H-06] `fas-theme.css` font alias classes map old names to wrong fonts

- **Severity:** High
- **Category:** Stale legacy style / wrong component variant
- **File:** `src/styles/fas-theme.css` (utilities layer)

```css
.font-kwajong {
  font-family: var(--font-display);
} /* Ethnocentric — not Kwajong */
.font-cyber {
  font-family: var(--font-label);
} /* Barlow Condensed — not Cyber Princess */
.font-cyber3d {
  font-family: var(--font-display);
} /* Ethnocentric — not Cyber3D */
.font-captain {
  font-family: var(--font-label);
} /* Barlow Condensed — not American Captain */
```

Class names are aliases from the old font set. Tailwind's `fontFamily` config still registers `captain: ['American Captain']`, so `font-captain` renders **two competing fonts** depending on cascade order — completely unpredictable output.

---

### 🟡 Medium

---

#### [M-01] `--fx-primary` CSS variable used but never defined — always falls back to `#fb3636`

- **Severity:** Medium
- **Category:** CSS variable mismatch
- **Files:** `src/components/FilterPanel.tsx:151,170`, `src/components/storefront/FilterPanelMobile.tsx:90,115,145`, `src/components/storefront/ShopSidebarFilters.tsx:157`

```tsx
style={{ accentColor: 'var(--fx-primary, #fb3636)' }}
```

`--fx-primary` is not defined anywhere. The fallback `#fb3636` is a bright orange-red that differs from all other primary variants.

**Fix:** Replace with `var(--red)`.

---

#### [M-02] Tailwind `container` padding set to `0px` at all breakpoints

- **Severity:** Medium
- **Category:** Tailwind mismatch
- **File:** `tailwind.config.js:37-46`

```js
container: { center: true, padding: { DEFAULT: '0px', sm: '0px', md: '0px', ... } }
```

Any component using Tailwind's `container` class gets zero padding. Actual spacing is hand-coded in `fas-theme.css` (`--container-pad-mobile: 28px`) and `global.css` (`--container-gutter: clamp(16px, 4vw, 32px)`) — two systems coexist and neither uses the Tailwind `container`.

---

#### [M-03] `html` and `body` background radial gradient hardcodes `#000000`

- **Severity:** Medium
- **Category:** Duplicate token / CSS variable mismatch
- **File:** `src/styles/global.css:52-62`

```css
html {
  background-color: var(--color-background); /* token-driven */
  background-image: radial-gradient(120% 120% at 50% 0%, #000000 0%, #121212 70%); /* hardcoded */
}
body {
  /* identical rule — duplicated */
}
```

Changing `--color-background` does not update the gradient. Both `html` and `body` rules are duplicated.

---

#### [M-04] `accountdashboard.astro` uses hardcoded `#d11219`

- **Severity:** Medium
- **Category:** Hardcoded value
- **File:** `src/components/accountdashboard.astro:156,193`

```css
border-color: #d11219;
color: #d11219;
```

---

#### [M-05] Heading hierarchy is inconsistent across pages

- **Severity:** Medium
- **Category:** Typography inconsistency

| Page/Component      | h1 style                                     | Notes                             |
| ------------------- | -------------------------------------------- | --------------------------------- |
| `Hero.tsx`          | `font-ethno text-3xl→text-7xl`               | Ethnocentric display font         |
| `StoreHero.astro`   | `font-borg italic text-5xl→text-6xl`         | Borgsquad — different brand font  |
| `vendor-portal/*`   | `text-3xl font-bold`                         | No brand font set — inherits body |
| `press-media.astro` | `text-3xl font-bold sm:text-4xl lg:text-5xl` | No brand font                     |
| `blog/[slug].astro` | `text-4xl font-bold text-white`              | No brand font                     |

No consistent `h1` typographic style across the site.

---

#### [M-06] `secondary` color (`#eef2fb`) is a light cream — used on dark backgrounds

- **Severity:** Medium
- **Category:** Hardcoded value / Tailwind mismatch
- **File:** `tailwind.config.js:59`, `src/components/Hero.tsx:79,107`, `src/components/ui/badge.tsx:27`, `src/components/ui/sheet.tsx:84`

`bg-secondary` (Tailwind utility) renders a light cream background — used in `badge.tsx` and `sheet.tsx` — visually broken on a dark-themed site.

---

#### [M-07] `ProductCardShowcase.astro` uses fully hardcoded card styles

- **Severity:** Medium
- **Category:** Hardcoded value / local override
- **File:** `src/components/storefront/ProductCardShowcase.astro:169,287`

```html
class="rounded-2xl border border-white/10
bg-[linear-gradient(180deg,rgba(24,24,24,0.96),rgba(10,10,10,0.98))]
shadow-[0_18px_50px_rgba(0,0,0,0.28)] hover:border-[#c41218]/50
hover:shadow-[0_26px_70px_rgba(0,0,0,0.4)] focus:ring-[#c41218]"
```

`rounded-2xl` (24px) while `tailwind.config.js` defines `borderRadius.card: '16px'`. Shadows don't use the `shadow-card` / `shadow-product-hover` tokens defined in the config.

---

#### [M-08] `--bg-dark-rgb` used in `tailwind.config.js` but never defined

- **Severity:** Medium
- **Category:** CSS variable mismatch
- **Files:** `tailwind.config.js:65`

```js
dark: 'rgb(var(--bg-dark-rgb) / <alpha-value>)',
```

`--bg-dark-rgb` is not defined anywhere. Any `bg-dark`, `text-dark`, or `bg-dark` utility produces `rgb(/ 0.5)` — invalid CSS that renders as transparent.

---

## 3. Typography Map

### Actual Text Styles In Use

| Role                         | Font                                  | Size                    | Weight | Where defined                              |
| ---------------------------- | ------------------------------------- | ----------------------- | ------ | ------------------------------------------ |
| **Page H1 (hero)**           | Ethnocentric (`font-ethno`)           | `text-3xl` → `text-7xl` | 900    | `Hero.tsx`, `ProductInfoPanel.astro`       |
| **Page H1 (store hero)**     | Borgsquad Italic (`font-borg italic`) | `text-5xl` → `text-6xl` | normal | `StoreHero.astro`                          |
| **Page H1 (vendor/blog)**    | Inter (body default)                  | `text-3xl`              | 700    | vendor portal pages, blog                  |
| **Section H2**               | Ethnocentric (`font-ethno`)           | `text-2xl` → `text-3xl` | 700    | `Highlights.astro`, `FAQSection.astro`     |
| **Section H2 (alternate)**   | Inter (body default)                  | `text-xl` → `text-2xl`  | 600    | vendor portal, cart page                   |
| **Product title**            | Ethnocentric (`font-ethno`)           | `text-sm` → `text-base` | 600    | `ProductCard.tsx`, `ProductCardLite.astro` |
| **Body / paragraph**         | Inter (`var(--font-body)`)            | `text-base` (14px)      | 400    | `fas-theme.css` body rule                  |
| **Nav links**                | Barlow Condensed                      | `0.78rem`               | 700    | `homepage-redesign.css`                    |
| **Button text (storefront)** | Ethnocentric (`font-ethno`)           | `text-xs` → `text-sm`   | 700    | Tailwind classes                           |
| **Button text (portal)**     | Inter (inherited)                     | `text-sm`               | 600    | Tailwind                                   |
| **Caption / eyebrow**        | Barlow Condensed                      | `text-xs`               | 700    | `homepage-redesign.css`                    |
| **Label / form**             | Inter                                 | `text-sm`               | 500    | Tailwind `font-medium`                     |
| **Price display**            | JetBrains Mono (`font-mono`)          | `text-xl`               | 400    | `ProductCard.tsx`                          |
| **Table text**               | Inter (inherited)                     | `text-sm`               | 400    | no explicit definition                     |
| **Helper / error**           | Inter                                 | `text-xs` → `text-sm`   | 400    | inline                                     |

### Duplicates / Near-Duplicates

- **H2 has two completely different styles**: `font-ethno text-2xl` (storefront) vs plain `text-xl font-semibold` (vendor portal)
- **H1 has three styles**: Ethnocentric hero, Borgsquad italic hero, plain `font-bold` (portal) — none coordinated
- **Button text is inconsistent**: storefront uses `font-ethno`, portal uses inherited Inter — same `<Button>` component variant renders differently depending on context
- **`CardTitle`** in `card.tsx` renders as `<h4>` with class `leading-none` only — no font size — inherits ambient context, so the same component renders at different sizes across the site

### Broken Hierarchy

- Product card title (`text-sm font-ethno`) is visually smaller than a nav link — title hierarchy inverted on shop pages
- Vendor portal has no brand font on any heading — looks like a different site

### Pages Not Following the System

- **Vendor portal** (`/vendor-portal/*`): plain Tailwind utility headings, no brand fonts, no token usage
- **Blog** (`/blog/*`): `text-4xl font-bold` only
- **`press-media.astro`**: generic Tailwind only
- **`become-a-vendor.astro`**: 31 hardcoded hex colors, entirely self-styled

---

## 4. Top Drift Hotspots

| Rank | File                                              | Hardcoded Hex Count | Root Issue                                                     |
| ---- | ------------------------------------------------- | ------------------- | -------------------------------------------------------------- |
| 1    | `src/styles/global.css`                           | 94                  | Master CSS file mixes every concern; never uses its own tokens |
| 2    | `src/components/checkout/CheckoutForm.css`        | 59                  | Standalone checkout CSS with no token imports                  |
| 3    | `src/pages/become-a-vendor.astro`                 | 31                  | Page-level `<style>` block with full standalone design         |
| 4    | `src/pages/about.astro`                           | 30                  | Same pattern — self-contained page styles                      |
| 5    | `src/styles/fas-theme2.css`                       | 25                  | New theme file that still hardcodes many values                |
| 6    | `src/components/header/fas-header.astro`          | 23                  | Entire nav hardcoded, doesn't use any token                    |
| 7    | `src/styles/fas-theme.css`                        | 20                  | Old theme file still loaded in parallel with theme2            |
| 8    | `src/pages/schedule.astro`                        | 20                  | Page-level self-contained styles                               |
| 9    | `src/components/homepage/BilletProductGrid.astro` | 20                  | Mix of `var()` with hardcoded fallbacks everywhere             |
| 10   | `src/components/banner/HellcatBanner.astro`       | 15                  | SVG + inline CSS with hardcoded hex                            |

---

## 5. Root Cause Summary

**The new theme (`fas-theme2.css`) is not propagating because it was added on top of the old system instead of replacing it.**

Four compounding problems:

1. **Two active theme files with competing `:root` blocks.** `global.css` imports `fas-theme.css`, and `BaseLayout.astro` independently imports `fas-theme2.css`. Both define the same CSS custom properties in plain `:root` selectors. Whichever file is bundled last by Astro wins — but this is non-deterministic.

2. **The Tailwind config was never updated to match the new theme.** `tailwind.config.js` still has `primary: '#ea1d26'` (old value), while `fas-theme2.css` defines `--red: #c41218`. Components using Tailwind utilities resolve to `#ea1d26`; components using CSS variables resolve to `#c41218`. Two different reds rendered side-by-side.

3. **Three broken values in `tailwind.config.js`** (`#121212)` with stray parenthesis) silently invalidate `bg-background`, `bg-neutral-900`, and `bg-zinc-900` across the entire site — causing visible background gaps or pure black holes.

4. **The `font-body` split.** Tailwind registers `font-body = American Captain`. The CSS system registers `--font-body = Inter`. Adding `font-body` to a className loads a display typeface on body copy. The CSS default `var(--font-body)` loads Inter. Two different body typefaces render depending on whether a component uses Tailwind utilities or CSS variables.

---

## 6. Fix Plan

### Phase 1 — Source of Truth Fixes

1. Fix the 3 syntax bugs in `tailwind.config.js` — remove `)` from `background`, `neutral.900`, `zinc.900`
2. Resolve the two-theme conflict — delete `fas-theme.css`, keep `fas-theme2.css` as the single token source; update `global.css` to `@import './fas-theme2.css'`; remove the separate import in `BaseLayout.astro`
3. Align Tailwind `primary` to match `--red` — change `tailwind.config.js primary` from `#ea1d26` to `#c41218`
4. Define `--bg-dark-rgb: 18, 18, 18` in the token file or remove the Tailwind `dark` color entry
5. Rename `fontFamily.body` key to `fontFamily.american-captain` to eliminate the font-body ambiguity
6. Replace all `oklch` values in `global.css` `.dark` block and shadcn `:root` block with hex equivalents

### Phase 2 — Shared Component Fixes

7. `src/components/ui/card.tsx` — `CardTitle` renders as `<h4>` with no size; add explicit `text-sm font-semibold` default
8. `src/components/storefront/ProductCardShowcase.astro` — replace all `bg-[#c41218]` with `bg-primary`, arbitrary shadows with `shadow-product-hover`, `rounded-2xl` with `rounded-card`
9. `src/components/header/fas-header.astro` — replace all 23 hardcoded hex values with `var(--red)` / `var(--text-primary)` / `var(--bg-base)`
10. `src/components/checkout/CheckoutForm.tsx:1100` — change `colorPrimary: '#dc2626'` to `'#c41218'`
11. `src/components/storefront/TruckGallery.astro:119` — remove `font-family: Nunito`
12. Filter components — replace `var(--fx-primary, #fb3636)` with `var(--red)` in `FilterPanel.tsx`, `FilterPanelMobile.tsx`, `ShopSidebarFilters.tsx`

### Phase 3 — Page-Level Fixes

13. `src/pages/become-a-vendor.astro` — extract the 31-color `<style>` block, replace with tokens
14. `src/pages/about.astro` — same treatment
15. `src/pages/schedule.astro` — same
16. Vendor portal pages — add `font-ethno` (or agreed brand font) to all `h1` elements
17. `src/components/accountdashboard.astro:156,193` — replace `#d11219` with `var(--red)`

### Phase 4 — Regression Prevention

18. Move `components.css` single hero rule into `global.css`; repurpose `components.css` for component-scoped styles
19. Add a comment block at the top of `fas-theme2.css` naming each token, its purpose, and what Tailwind key it maps to
20. Add Stylelint rule against bare hex colors outside of token files
21. Add ESLint rule to flag `bg-[#...]` or `text-[#...]` arbitrary Tailwind values in JSX/Astro

---

## 7. Quick Wins

Smallest changes with biggest immediate visual impact:

| #     | Change                                                      | File                          | Impact                                                          |
| ----- | ----------------------------------------------------------- | ----------------------------- | --------------------------------------------------------------- |
| **1** | Fix `'#121212)'` → `'#121212'` (3 values)                   | `tailwind.config.js:63,68,69` | Fixes broken backgrounds site-wide                              |
| **2** | Remove `import '../styles/fas-theme2.css'` from BaseLayout  | `BaseLayout.astro:3`          | Eliminates double-`:root` cascade immediately                   |
| **3** | Change `primary: '#ea1d26'` → `'#c41218'`                   | `tailwind.config.js:58`       | Unifies all `text-primary`/`bg-primary` utilities with CSS vars |
| **4** | Replace `var(--fx-primary, #fb3636)` with `var(--red)`      | 3 filter components           | Fixes bright orange accent on filter checkboxes                 |
| **5** | Fix Stripe `colorPrimary: '#dc2626'` → `'#c41218'`          | `CheckoutForm.tsx:1100`       | Checkout form accent matches brand                              |
| **6** | Remove `font-family: Nunito, sans-serif`                    | `TruckGallery.astro:119`      | Eliminates rogue font in gallery                                |
| **7** | Add `--bg-dark-rgb: 18, 18, 18` to `fas-theme2.css` `:root` | `fas-theme2.css`              | Fixes `bg-black/*` opacity utilities                            |
| **8** | Rename `fontFamily.body` → `fontFamily.american-captain`    | `tailwind.config.js:85`       | Eliminates font-body identity split                             |
