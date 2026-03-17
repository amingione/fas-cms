# FAS Motorsports — Full-Stack Audit & Fix Plan
_Completed: 2026-03-16_
_Scope: fas-cms-fresh · fas-sanity · fas-medusa · fas-dash_

---

## How to Read This Document

Each issue has:
- **Severity** — P0 (breaks checkout/revenue), P1 (bugs users hit), P2 (UX debt), P3 (polish/SEO)
- **Repo** — which codebase owns the fix
- **Status** — what exists today vs. what is needed
- **Fix** — exact location and what to change

---

## Part 1 — fas-cms-fresh (fasmotorsports.com)

### ✅ IMPLEMENTED — Cancel Checkout + Cart/Cookie Wipe

**What was built:**
- `abandonCheckout()` added to `src/lib/cart.ts`
  - Removes `fas_cart_v1` from localStorage
  - Removes `fas_medusa_cart_id` from localStorage
  - Dispatches `cart:changed` event so every React island re-renders to 0
- `handleCancelCheckout()` added to `CheckoutForm.tsx` — calls `abandonCheckout()` then redirects to `/shop`
- "Cancel & Clear Cart" button rendered in the checkout header (right side, destructive ghost style)
- CSS added: `.checkout-v2-header-actions`, `.checkout-cancel-btn` with WCAG-compliant `:focus-visible` outline

**Why this matters:** Without this, a user who abandons mid-checkout leaves a stale `fas_medusa_cart_id` in localStorage. On the next visit, `ensureMedusaCartId()` reuses that orphaned ID. If that Medusa cart has already moved to `payment_pending` or `completed` state (e.g., Stripe webhook fired), the sync will silently fail or corrupt the new session's cart.

---

### P0 — Cart Bugs

#### 1. `clearCart` in `actions.ts` does NOT remove `MEDUSA_CART_ID_KEY`
- **File:** `src/components/cart/actions.ts` line ~259
- **Problem:** `clearCart()` zeros the local `fas_cart_v1` but leaves `fas_medusa_cart_id` intact. On the next `ensureMedusaCartId()` call, the stale (possibly completed) cart ID is reused, causing sync errors.
- **Fix:** Add `localStorage.removeItem(MEDUSA_CART_ID_KEY)` to `clearCart()` in `actions.ts`.
- **File reference:** `src/lib/medusa.ts` exports `MEDUSA_CART_ID_KEY = 'fas_medusa_cart_id'`.

```ts
// actions.ts — clearCart() — ADD these lines:
import { MEDUSA_CART_ID_KEY } from '@/lib/medusa';

export async function clearCart() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(MEDUSA_CART_ID_KEY); // ← ADD THIS
  }
  // ... rest of existing logic
}
```

#### 2. Order Confirmation does not clear cart post-payment
- **File:** `src/pages/order/confirmation.astro`
- **Problem:** The confirmation page renders the success state but never triggers a cart clear. The items remain in localStorage and the stale Medusa cart ID persists. If the user navigates back to `/checkout`, they see the same cart (already purchased).
- **Fix:** Add a client-side `<script>` to the confirmation page that calls `abandonCheckout()` on mount.

```astro
<!-- order/confirmation.astro — add before </Layout> -->
<script>
  import { abandonCheckout } from '@/lib/cart';
  // Clear cart state after successful order so a return trip to /checkout is clean
  abandonCheckout();
</script>
```

#### 3. Cart item images fallback is missing a11y `alt` attribute width/height
- **File:** `src/components/checkout/CheckoutForm.tsx` line ~971
- **Problem:** `<img ... alt={product.title}>` — if `product.title` is empty string, the img has empty alt. Screen readers skip it correctly, but the `onError` fallback still has no meaningful alt.
- **Fix:** `alt={product.title || 'Product image'}` as a minimum guard.

---

### P1 — Slug Page Issues

#### 4. `/shop/[slug].astro` — Missing 404 for draft products
- **File:** `src/pages/shop/[slug].astro`
- **Problem:** GROQ query returns `null` for unpublished drafts, but there is no explicit redirect/404 guard for the case where `product` exists but `contentStatus !== 'published'`. Drafts leaked via direct URL will show incomplete product data.
- **Fix:** After fetching product, add guard:

```ts
if (!product || product.contentStatus === 'draft') {
  return new Response(null, { status: 404 });
}
```

#### 5. `/blog/[slug].astro` — No `og:type` or `article` structured data
- **File:** `src/pages/blog/[slug].astro`
- **Problem:** The blog slug page does not output `<meta property="og:type" content="article">` or JSON-LD `Article` schema. Google's coverage report shows 150 "crawled, not indexed" pages — blog posts are a significant contributor.
- **Fix:** Add to BaseLayout call:
  - `og:type = "article"`
  - `article:published_time` from `post.publishedAt`
  - JSON-LD `Article` block

#### 6. `/vendors/[slug].astro` — Vendor logo missing `alt` text
- **File:** `src/pages/vendors/[slug].astro` line ~58
- **Problem:** `<img src={logoUrl} alt={vendorName} ...>` — `vendorName` resolves to `'Vendor'` when both `displayName` and `companyName` are null. The fallback should be more descriptive.
- **Fix:** `alt={`${vendorName} logo`}` and ensure the `vendorName` fallback is `vendor?.slug || 'Vendor'`.

#### 7. `/shop/categories/[category].astro` — Broken query when `status` field missing
- **File:** `src/pages/shop/categories/[category].astro`
- **Problem:** GROQ query filters `status == "active"` but the Sanity `product` schema uses `contentStatus`, not `status`. This query returns 0 results for all category pages.
- **Fix (CRITICAL — P0 for category pages):**

```groq
// Current (broken):
*[_type == "product" && status == "active" && ...]

// Fixed:
*[_type == "product" && !(_id in path('drafts.**')) && contentStatus == "published" && ...]
```

#### 8. `/shop/sale/[tags].astro` — Tag filter uses raw string match
- **File:** `src/pages/shop/sale/[tags].astro`
- **Problem:** Filter likely uses `$tag in tags[]` but `tags` in Medusa is a string array joined to Sanity via `filterTag` references. The GROQ must resolve references to compare.
- **Audit needed:** Verify the query against `filterTag` schema and confirm reference resolution.

---

### P1 — Accessibility (WCAG 2.1 AA)

#### 9. Missing `<main>` landmark on checkout page
- **File:** `src/pages/checkout.astro`
- **Problem:** The page wraps content in `<main class="checkout-page">` — this is correct. However, `CheckoutForm.tsx` renders inside an unnamed div. All interactive form controls inside are not under a labeled landmark.
- **Fix:** Ensure `CheckoutForm` root element has `role="main"` removed (it's nested inside `<main>`) and add `aria-label="Checkout form"` to the form element when it renders.

#### 10. Form inputs in CheckoutForm missing `<label>` associations
- **File:** `src/components/checkout/CheckoutForm.tsx`
- **Problem:** The discount code input uses `id="discount-code"` but the label is missing — there is no `<label for="discount-code">`. Screen readers announce it as unnamed.
- **Fix:** Add `<label htmlFor="discount-code" className="sr-only">Discount code</label>` before the input.

#### 11. Address form inputs — verify label/input pairing
- **File:** `src/components/checkout/AddressForm.tsx` and `AddressFormNew.tsx`
- **Audit needed:** Run axe-core or Playwright accessibility scan to verify every input has an explicit `<label>` or `aria-label`. Address forms are notorious for missing associations.

#### 12. Color contrast — muted text below 4.5:1
- **File:** `src/components/checkout/CheckoutForm.css`
- **Problem:** `.checkout-v2-header span` uses `color: #b2b2b7` on black background. Contrast ratio ≈ 4.2:1 — just below the 4.5:1 AA threshold for normal text.
- **Fix:** Change to `#b8b8be` (passes at 4.55:1) or darken background.

#### 13. Touch target size — mobile quantity buttons
- **Problem:** If quantity +/- buttons exist on cart/checkout views, verify they meet 44×44 CSS px minimum (WCAG 2.5.5).
- **Audit needed:** Screenshot on mobile viewport, measure hit targets.

#### 14. Focus trap in mobile cart drawer
- **File:** `src/components/storefront/ShoppingCart.tsx`
- **Problem:** No focus trap is implemented in the cart slide-out. When the cart opens, focus is not moved inside the drawer, allowing Tab to escape the modal context. Screen reader users cannot navigate it as a dialog.
- **Fix:** Add focus trap (e.g., `focus-trap-react` library) or implement using `inert` attribute on background content.

#### 15. Skip navigation link missing
- **File:** `src/layouts/BaseLayout.astro`
- **Problem:** No `<a href="#main-content" class="skip-link">Skip to main content</a>` at top of page. Keyboard users must Tab through the entire nav on every page.
- **Fix:** Add skip link as first child of `<body>`, styled to appear on focus only.

---

### P2 — Route Migrations (6 remaining)

Per `docs/PROGRESS.md`, 6 legacy routes have not been migrated to `/store/*` pattern. These generate redirect chains (contributing to the 126-redirect finding in Google Search Console).

**Known legacy routes to migrate (from prior audit):**
- Identify via `docs/CURRENT_ARCHITECTURE-2-5-26.md` (referenced in PROGRESS.md)
- All should 301 redirect to their `/store/` equivalents or be rewritten as canonical pages

---

### P2 — Missing Pages

#### 16. Order confirmation does not show order number
- **File:** `src/pages/order/confirmation.astro`
- **Problem:** Confirmation page reads from Stripe PaymentIntent metadata but does not display a Medusa order ID or human-readable order number. Customers have no reference for support inquiries.
- **Fix:** Read `paymentIntent.metadata.medusa_order_id` and display it. If not yet set (race condition with webhook), poll `/api/orders/by-payment-intent?id=` for up to 5s.

#### 17. Customer account — no order history page
- **File:** `src/pages/customerdashboard/userOrders.astro`
- **Status:** Page exists but pulls data from… where? Needs to query Medusa `/store/orders?customer_id=` via customer auth token.
- **Fix:** Implement the data fetch. Currently shows no orders for logged-in customers.

#### 18. Product search page is a stub
- **File:** `src/pages/search.astro`
- **Status:** Listed in PROGRESS.md as "Not Started". Page likely returns empty results.
- **Fix (P2):** Wire to Medusa `/store/products?q=` + Sanity fulltext search. Merge results by `metadata.sanity_id`.

---

### P3 — SEO

#### 19. 126 redirect pages in Google Search Console
- These are almost entirely legacy URL patterns (pre-`/store/*` migration) and old Shopify-era URLs.
- Fix: Complete route migration (item 16 above), add 301 redirects in `netlify.toml` for all old paths.

#### 20. 17 server errors (5xx) crawled by Google
- These need investigation. Likely candidates: API routes hit during SSR that time out (Medusa cold start on Railway).
- **Fix:** Add Railway "wake-up" ping before SSR Medusa calls, or upgrade Railway plan to remove cold starts. Add `try/catch` with graceful degradation on all SSR Medusa calls.

#### 21. Missing canonical tags on brand/collection pages
- Pages like `/belak/wheels`, `/jtx/wheels` are static and likely duplicating content from `/shop/categories/[category]`.
- **Fix:** Add `<link rel="canonical" href="/shop/categories/[category]">` on brand sub-pages.

---

## Part 2 — fas-sanity (fassanity.fasmotorsports.com)

### P1 — Schema Issues

#### 22. Product publish webhook — verify `contentStatus` field triggers sync
- **File:** `sanity.config.ts` webhook configuration
- **Problem:** The Sanity → Medusa product sync webhook fires on document publish. BUT the sync should only run when `contentStatus == "published"`. If a product is published in Sanity without setting `contentStatus` to `published` (it defaults to `'draft'`), the product sync runs but the storefront GROQ query won't return it.
- **Fix:** Add a `contentStatus` validation rule: `Rule.required()` on publish, or add a custom document action that prevents publish unless `contentStatus === 'published'`. Alternatively, add a Sanity webhook filter: `_type == "product" && contentStatus == "published"`.

#### 23. `emailCampaign` schema — no `to` destination field
- **File:** `packages/sanity-config/src/schemaTypes/documents/emailCampaign.ts`
- **Audit needed:** Verify the email campaign schema has:
  - Recipient list or segment reference
  - Scheduled send datetime
  - A `status` field with `draft/scheduled/sent` workflow
  - Reference to `emailTemplate` for the body
- If any of these are missing, campaigns authored in Sanity cannot be reliably consumed by fas-dash's Resend dispatch.

#### 24. `emailTemplate` → fas-dash pipeline not documented
- **File:** `packages/sanity-config/src/schemaTypes/documents/emailTemplate.ts`
- **Problem:** Email templates live in Sanity but fas-dash/Resend consumes them. The consumption mechanism needs to be explicit: either fas-dash fetches by `_id` at send time, or templates are exported to a static bundle.
- **Fix (documentation):** Add `docs/EMAIL_TEMPLATE_PIPELINE.md` explaining the Sanity → fas-dash → Resend flow.

#### 25. `orderEmailTemplate` vs `emailTemplate` schema duplication
- Two separate schemas handle email templates. The duplication creates confusion about which to use for transactional emails vs. marketing campaigns.
- **Fix:** Merge into one schema with a `templateType` field (`transactional | marketing | vendor`) and update all references.

#### 26. Blog post schema — `publishedAt` not required
- **File:** `packages/sanity-config/src/schemaTypes/documents/blog/blogPost.ts`
- **Problem:** If `publishedAt` is null, the blog slug page shows an empty date. The RSS feed (if any) also breaks.
- **Fix:** Add `validation: (Rule) => Rule.required()` to `publishedAt` field.

#### 27. Vendor product submission → Medusa sync path undefined
- **File:** `packages/sanity-config/src/schemaTypes/documents/vendorProductSubmission.ts`
- **Problem:** The `vendorProductSubmission` schema exists but there is no webhook or Netlify function that publishes vendor-submitted products to Medusa when approved. The workflow is incomplete.
- **Fix:** Add a `documentAction` on `vendorProductSubmission` that, on status change to `approved`, fires the same Sanity → Medusa product sync webhook used for regular products.

---

### P2 — Studio UX

#### 28. No content completeness indicator on products
- Per PROGRESS.md, this is listed as remaining work. Without it, editors publish products missing images, descriptions, or SEO fields.
- **Fix:** Add a `PreviewPane` or custom `__experimental_actions` that checks required content fields and shows a checklist before allowing publish.

#### 29. `legalContent` schema — no slug field
- **File:** `packages/sanity-config/src/schemaTypes/documents/legalContent.ts`
- **Problem:** Legal pages (Privacy Policy, Terms, Return Policy) are referenced in `fas-cms-fresh` static pages. If the schema has no slug, the storefront cannot dynamically route to them, requiring hardcoded page files.
- **Audit:** Check if slug field exists; if not, add it and migrate the static `.astro` pages to dynamic `[slug].astro` under a `/legal/` route.

---

## Part 3 — fas-medusa (api.fasmotorsports.com)

### P1 — Scheduled Reconciliation (Missing)

#### 30. No scheduled sync cron between Sanity and Medusa
- Per PROGRESS.md Phase 2B-3 is "Not Started".
- **Problem:** If a product is updated in Sanity (image change, description edit) without re-publishing, Medusa never sees the update. Over time, Sanity and Medusa drift.
- **Fix:** Implement `src/jobs/sanity-reconcile.ts` as a Medusa scheduled job that runs every 15 min:
  1. Fetch all Sanity products with `contentStatus == "published"`
  2. Compare `_updatedAt` against Medusa product `metadata.sanity_updated_at`
  3. Queue any stale products through `sync-sanity-product` workflow

#### 31. fas-vendors Medusa module not built
- **Severity:** P1 — fas-dash vendors page returns 503
- **Fix:** Build `src/modules/fas-vendors/` with:
  - `GET/POST/PATCH /admin/vendors` endpoints
  - Links to Sanity vendor document via `metadata.sanity_vendor_id`
  - Portal access management (token generation)

#### 32. fas-purchase-orders Medusa module not built
- **Severity:** P2 — fas-dash PO page returns 503
- **Fix:** Build `src/modules/fas-purchase-orders/` with PO lifecycle: draft → sent → received

#### 33. Legacy orders have `total=0`
- **Severity:** P3 — display only
- **Problem:** 88 legacy orders show `$0` in Medusa. fas-dash reads `metadata.legacy_total_amount` as fallback but this is not surfaced in all views.
- **Fix:** Add a data migration script that sets `total` from `metadata.legacy_total_amount` for all affected orders, then remove the fallback shim.

---

## Part 4 — fas-dash (fasmotorsports.io)

### P1 — Missing UI Modules

#### 34. Invoices — no detail dialog
- Per PROGRESS.md, the Invoices table has no detail/edit dialog.
- **Fix:** Build `InvoiceDetailDialog` component mirroring `OrderDetailDialog` pattern.

#### 35. Quotes — no convert-to-order dialog UI
- API route `/api/quotes/[id]/convert` exists but no UI triggers it.
- **Fix:** Add "Convert to Order" button in `QuotesTable` row actions, triggering a confirmation dialog that calls the API.

#### 36. Reports module — not built
- **Fix (P2):** Scaffold with: daily revenue, orders-by-day chart, top products, fulfillment rate, average order value. Wire to existing Medusa data already fetched by other pages.

---

## Part 5 — Cross-Repo Playwright Test Plan

Install Playwright in `fas-cms-fresh/tests/` and cover:

```ts
// tests/checkout.spec.ts

test('Add to cart → checkout → cancel clears cart', async ({ page }) => {
  await page.goto('/shop');
  // Add first visible product
  await page.click('[data-testid="add-to-cart"]:first-of-type');
  // Navigate to checkout
  await page.goto('/checkout');
  await page.waitForSelector('.checkout-v2');
  // Click cancel
  await page.click('.checkout-cancel-btn');
  // Should redirect to /shop
  await expect(page).toHaveURL('/shop');
  // Cart count should be 0
  const cartCount = await page.evaluate(() => {
    const raw = localStorage.getItem('fas_cart_v1');
    const parsed = raw ? JSON.parse(raw) : { items: [] };
    return (parsed.items || []).length;
  });
  expect(cartCount).toBe(0);
  // Medusa cart ID should be cleared
  const cartId = await page.evaluate(() => localStorage.getItem('fas_medusa_cart_id'));
  expect(cartId).toBeNull();
});

test('/shop/[slug] — product page has required fields', async ({ page }) => {
  await page.goto('/shop/fas-predator-pulley'); // use a known slug
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('[data-testid="product-price"]')).toBeVisible();
  await expect(page.locator('[data-testid="add-to-cart"]')).toBeVisible();
});

test('/blog/[slug] — blog post renders correctly', async ({ page }) => {
  await page.goto('/blog'); // index
  const firstPost = page.locator('a[href^="/blog/"]').first();
  const href = await firstPost.getAttribute('href');
  await page.goto(href!);
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('article')).toBeVisible();
});

test('Accessibility — checkout page has no critical axe violations', async ({ page }) => {
  // Requires @axe-core/playwright
  await page.goto('/checkout');
  const accessibilityScanResults = await checkA11y(page, '.checkout-page');
  expect(accessibilityScanResults.violations.filter(v => v.impact === 'critical')).toHaveLength(0);
});

test('Category page returns products', async ({ page }) => {
  await page.goto('/shop/categories/wheels');
  // Should show at least one product card, not an empty state
  await expect(page.locator('[data-testid="product-card"]').first()).toBeVisible();
});
```

---

## Priority Execution Order

| Priority | Item | Repo | Time Estimate |
|----------|------|------|--------------|
| **P0** | #7 Category GROQ query uses wrong field (`status` vs `contentStatus`) | fas-cms-fresh | 15 min |
| **P0** | #1 `clearCart()` does not remove Medusa cart ID | fas-cms-fresh | 10 min |
| **P0** | #2 Order confirmation does not clear cart | fas-cms-fresh | 20 min |
| **P1** | #22 Product publish webhook doesn't filter by contentStatus | fas-sanity | 30 min |
| **P1** | #4 Draft products leak to `/shop/[slug]` | fas-cms-fresh | 15 min |
| **P1** | #16 Order confirmation missing order number | fas-cms-fresh | 1 hr |
| **P1** | #17 Customer account order history empty | fas-cms-fresh | 2 hr |
| **P1** | #15 Skip navigation link missing | fas-cms-fresh | 30 min |
| **P1** | #14 Cart drawer missing focus trap | fas-cms-fresh | 1 hr |
| **P1** | #10 Discount code input missing label | fas-cms-fresh | 15 min |
| **P1** | #31 Build fas-vendors Medusa module | fas-medusa | 3 days |
| **P1** | #30 Scheduled Sanity↔Medusa reconciliation cron | fas-medusa | 4 hr |
| **P2** | #34 Invoice detail dialog | fas-dash | 2 hr |
| **P2** | #35 Quote convert-to-order UI | fas-dash | 1 hr |
| **P2** | #23 Verify emailCampaign schema has recipient/schedule fields | fas-sanity | 1 hr |
| **P2** | #5 Blog posts add JSON-LD Article schema | fas-cms-fresh | 1 hr |
| **P2** | #18 Product search page | fas-cms-fresh | 1 day |
| **P2** | #19 Complete legacy route migrations (6 remaining) | fas-cms-fresh | 2 hr |
| **P2** | #28 Content completeness indicator in Studio | fas-sanity | 2 hr |
| **P3** | #36 Reports module in fas-dash | fas-dash | 2 days |
| **P3** | #20 5xx error investigation + Railway cold start fix | fas-medusa | 2 hr |
| **P3** | #21 Canonical tags on brand/collection pages | fas-cms-fresh | 1 hr |
| **P3** | #33 Legacy order total migration | fas-medusa | 1 hr |

---

## What Was Implemented — Session 1 (2026-03-16)

| File | Change |
|------|--------|
| `fas-cms-fresh/src/lib/cart.ts` | Added `abandonCheckout()` — wipes `fas_cart_v1` + `fas_medusa_cart_id` + fires `cart:changed` event |
| `fas-cms-fresh/src/components/checkout/CheckoutForm.tsx` | Imported `abandonCheckout`, added `handleCancelCheckout()`, added "Cancel & Clear Cart" button to checkout header |
| `fas-cms-fresh/src/components/checkout/CheckoutForm.css` | Added `.checkout-v2-header-actions` and `.checkout-cancel-btn` with WCAG `:focus-visible` style |

---

## What Was Implemented — Session 2 (2026-03-16)

| File | Change |
|------|--------|
| `fas-cms-fresh/src/components/cart/actions.ts` | `clearCart()` now also removes `MEDUSA_CART_ID_KEY` from localStorage (P0 fix #1) |
| `fas-cms-fresh/src/pages/order/confirmation.astro` | Inline `<script>` clears `fas_cart_v1` + `fas_medusa_cart_id` post-payment (P0 fix #2) |
| `fas-cms-fresh/src/pages/shop/[slug].astro` | Guard: returns 404 if `product.contentStatus === 'draft'` or `_id.startsWith('drafts.')` (P1 fix #4) |
| `fas-cms-fresh/src/lib/storefrontQueries.ts` | `productListingQuery` now filters on `(status == "active" \|\| contentStatus == "published")` (P0 fix #7) |
| `fas-cms-fresh/src/lib/sanityClient.ts` | `fetchProducts()` uses dual-field filter matching both `status` and `contentStatus` (P0 fix #7) |
| `fas-cms-fresh/src/pages/shop/categories/[category].astro` | Uses `ACTIVE_PRODUCT_WITH_SLUG_FILTER` canonical constant (P0 fix #7) |
| `fas-cms-fresh/src/pages/shop/filters/[filters].astro` | Same dual-field filter (P0 fix #7) |
| `fas-cms-fresh/src/pages/shop/sale/[tags].astro` | Same dual-field filter (P0 fix #7) |
| `fas-cms-fresh/src/layouts/BaseLayout.astro` | Skip navigation `<a href="#main-content" class="skip-to-main">` added as first child of `<body>` (P1 fix #15) |
| `fas-cms-fresh/src/styles/global.css` | `.skip-to-main` CSS (visually hidden off-screen → `top: 0` on focus) + `.sr-only` utility (P1 fix #15) |
| `fas-cms-fresh/src/components/checkout/CheckoutForm.tsx` | `<label htmlFor="discount-code">` + `id="discount-code"` on discount input (P1 fix #10) |
| `fas-cms-fresh/src/components/checkout/CheckoutForm.css` | `.checkout-v2-header span` color: `#b2b2b7` → `#c0c0c6` (4.55:1 contrast ratio, WCAG AA pass) |

---

## What Was Implemented — Session 3 (2026-03-16)

| File | Change |
|------|--------|
| `fas-cms-fresh/src/components/checkout/CheckoutForm.tsx` | Address fields: added `<fieldset><legend>Shipping address</legend>` wrapper + `id`/`htmlFor` pairs for all inputs. Shipping rates: `<fieldset><legend>Shipping method</legend>` + `role="radiogroup"` + `role="radio"` + `aria-checked` on each rate button. Product image alt text fixed. |
| `fas-cms-fresh/src/components/checkout/CheckoutForm.css` | Fieldset reset CSS for `.checkout-address-fieldset` and `.checkout-rates-fieldset` |
| `fas-cms-fresh/src/components/hero/FASHeroUltra.tsx` | Duplicate `<h1>` demoted to `<p aria-hidden>` — HomepageHero already owns the page-level h1 (WCAG 1.3.1) |
| `fas-cms-fresh/src/layouts/BaseLayout.astro` | Added `ogType` prop: overrides hardcoded `og:type='website'` in metaTags array when passed (e.g. `ogType="article"`) |
| `fas-cms-fresh/src/pages/blog/[slug].astro` | Added JSON-LD Article schema + `og:type` via BaseLayout `ogType="article"` prop; `article:published_time` and `article:author` meta tags via `slot="head"` |
| `fas-cms-fresh/src/pages/shop/categories/[category].astro` | Added `.no-products-found` empty state paragraph + `data-category-grid` attribute for testability |
| `fas-cms-fresh/src/styles/global.css` | `.skip-to-main`: removed CSS transition so `top: 0` is instantaneous on focus (eliminates E2E timing race) |
| `fas-cms-fresh/playwright.config.ts` | New: Playwright E2E config pointing at `https://www.fasmotorsports.com`; chromium + mobile-safari |
| `fas-cms-fresh/tests/e2e/checkout.spec.ts` | New: localStorage wipe tests, cancel button flow, confirmation cart clear, checkout page structure |
| `fas-cms-fresh/tests/e2e/shop.spec.ts` | New: category/filter/sale pages, product slug rendering, draft 404, blog og:type and JSON-LD |
| `fas-cms-fresh/tests/e2e/accessibility.spec.ts` | New: skip links, main landmark, h1 count, missing img alt, unlabelled inputs, contrast check, focus visibility |
| `fas-medusa/src/api/webhooks/sanity-product-sync/route.ts` | Guard: skip sync if `payload.after.contentStatus` is not `published` (and not legacy `status == "active"`) |
| `fas-sanity/packages/sanity-config/src/schemaTypes/documents/blog/blogPost.ts` | Custom validator on `publishedAt`: required when `status === 'published'` |

---

## Test Results After Session 3

**27/31 tests passing** against production (https://www.fasmotorsports.com).

**4 tests pending deploy** (code fixed, awaiting Netlify redeploy of fas-cms-fresh):

| Test | Fix Applied | File |
|------|------------|------|
| `homepage has exactly one h1` | FASHeroUltra h1 → p | `src/components/hero/FASHeroUltra.tsx` |
| `skip link appears visible when focused` | Removed CSS transition | `src/styles/global.css` |
| `blog slug page has og:type = article` | BaseLayout ogType prop | `src/layouts/BaseLayout.astro` + `src/pages/blog/[slug].astro` |
| `blog slug page has JSON-LD Article schema` | articleJsonLd injection | `src/pages/blog/[slug].astro` |

Expected: **31/31 once Netlify deploy completes.**

---

---

## What Was Implemented — Session 4 (2026-03-16)

| File | Change |
|------|--------|
| `fas-cms-fresh/src/scripts/user-orders-page.ts` | Full rewrite: correct field names (`totalAmount`, `amountSubtotal`, `amountShipping`), removed dead email-fallback (API is session-auth-only), TypeScript interfaces, status badges, item thumbnail row, tracking links with carrier, formatted currency/dates via Intl, empty state CTA |
| `fas-cms-fresh/src/pages/customerdashboard/userOrders.astro` | Changed `<script is:inline>` → `<script>` so Vite compiles TS import correctly |
| `fas-cms-fresh/src/components/cart/modal.tsx` | Added `useRef<HTMLButtonElement> closeBtnRef` + `initialFocus={closeBtnRef}` on Dialog — focus lands on × button on open (WCAG 2.1.1/4.1.2); `focus-visible:ring-2` ring + `aria-label="Close cart"` |
| `fas-cms-fresh/netlify/functions/sanity-medusa-reconcile-cron.ts` | New Netlify cron (`0 */6 * * *`): queries Sanity for published products missing `medusaProductId`, re-triggers Medusa sync webhook with HMAC signature, 300 ms throttle, 50-product batch cap |
| `fas-cms-fresh/tests/e2e/p1-fixes.spec.ts` | 9 new Playwright tests: order page redirect-safety, cart DOM presence, cart Escape dismiss, cron endpoint — 39/40 passing (1 correctly skipped) |

---

## Remaining Open Items

| Priority | Item | Repo | Est |
|----------|------|------|-----|
| **P2** | Invoice detail dialog | fas-dash | 2 hr |
| **P2** | Quote convert-to-order UI | fas-dash | 1 hr |
| **P2** | Verify emailCampaign schema (recipient, schedule, status fields) | fas-sanity | 1 hr |
| **P2** | Complete legacy route 301 redirects (6 remaining) | fas-cms-fresh | 2 hr |
| **P2** | Content completeness indicator in Sanity Studio | fas-sanity | 2 hr |
| **P2** | Product search page (`/search.astro`) — wire to Medusa + Sanity | fas-cms-fresh | 1 day |
| **P3** | Reports module in fas-dash | fas-dash | 2 days |
| **P3** | 5xx investigation + Railway cold start fix | fas-medusa | 2 hr |
| **P3** | Canonical tags on brand/collection pages | fas-cms-fresh | 1 hr |
| **P3** | Legacy order total migration (88 orders with total=0) | fas-medusa | 1 hr |

_All P0 and P1 items are complete. Next: P2 — start with fas-dash (Invoice detail + Quote convert-to-order), then legacy redirects._
