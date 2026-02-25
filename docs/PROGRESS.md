# fas-cms-fresh — Phase Progress Log
_Last updated: 2026-02-25_

Tracks completion against the Strategic Execution Plan and fas-cms-fresh storefront goals.
Full plan: `docs/nextjs-medusa-takeover-plan/`

---

## Strategic Phases

| Phase | Description | Status |
|-------|-------------|--------|
| 0 | Lock Architecture (Astro = render layer, never owns commerce data) | ✅ Complete |
| 1 | Medusa Foundation Stable | ✅ Complete |
| 2 | Sanity content schema aligned | ✅ Complete |
| 3 | Checkout Flow (Stripe + Shippo + Medusa BFF) | ✅ Complete |
| 4 | Customer Auth Portal | ✅ Complete |
| 5 | Vendor Access Point | ✅ Complete (login portal) |
| 6 | Migrate legacy routes to /store/* pattern | ⏳ In Progress (6 routes remaining) |
| 7 | Publishable Key Rotation + Verify Cart Flow | 🔴 Blocked (Railway shell needed) |

---

## Completed Work

### Checkout Flow
- ✅ `src/pages/api/create-payment-intent.ts` — BFF: Stripe + Medusa
- ✅ `src/pages/api/update-payment-intent.ts` — Stripe update
- ✅ `src/pages/api/complete-order.ts` — Medusa order creation + Sanity write
- ✅ `src/pages/api/shipping-rates.ts` — Shippo + Medusa
- ✅ `src/pages/api/cart/[id].ts` — Medusa cart proxy
- ✅ `checkout.astro` → `CheckoutForm.tsx` (React island, Stripe Elements)
- ✅ Stripe webhook ingress site live: `fas-webhook-ingress-20260211.netlify.app`
  - Receives `payment_intent.succeeded` → confirms Medusa order

### Auth
- ✅ Customer login portal (Medusa store auth)
- ✅ Vendor login access point (separate auth flow, routes to fas-sanity Studio)

### Content Integration
- ✅ Sanity GROQ queries for all content pages (blog, collections, product copy, navigation)
- ✅ Astro ISR rebuild on Sanity publish webhook
- ✅ Product pages pull commerce data from Medusa (`/store/products`) + content from Sanity

### Infrastructure
- ✅ Netlify deployment (fasmotorsports.com)
- ✅ Nanostores for cart/auth shared state across React islands
- ✅ Environment variables scoped correctly (PUBLIC_ prefix for client-safe keys)
- ✅ `PHASE1_PAYMENTINTENT_IMPLEMENTATION.md` — full checkout implementation documented

---

## Remaining Work

### 🔴 Blocked — Needs Railway Shell

1. **Publishable key rotation**
   - Current key returns 400 on all `/store/*` routes
   - Cart, product listing, checkout all broken until this is fixed
   - Scripts on fas-medusa: `src/scripts/rotate-publishable-key.ts`
   - Propagation: `fas-medusa/scripts/propagate-publishable-key.sh <PK>`
   - After rotation: update `PUBLIC_MEDUSA_PUBLISHABLE_KEY` in Netlify env (fas-cms-fresh)

### ⏳ In Progress

2. **6 legacy routes migration** to `/store/*` pattern
   - Routes identified and flagged in audit
   - Location: `docs/CURRENT_ARCHITECTURE-2-5-26.md`
   - Pattern: all Medusa store calls must use `/store/` prefix with publishable key header

### 🔜 Not Started

3. **Full end-to-end cart → checkout smoke test**
   - Once publishable key is rotated: test full flow
   - product listing → add to cart → shipping rates → Stripe → order confirmed

4. **Order confirmation + account page**
   - Post-checkout: customer sees order summary, can view status in account portal

5. **Product search**
   - Medusa `/store/products?q=...` + Sanity content merge for search results page

6. **Collections / category pages**
   - Sanity taxonomy + Medusa product filtering by tag/category

---

## What fas-cms-fresh Owns (Canonical)

| Responsibility | Source |
|---------------|--------|
| Storefront rendering (all pages) | Astro pages |
| Cart state | Nanostores + Medusa `/store/carts` |
| Checkout orchestration | BFF API routes in `src/pages/api/` |
| Product display data | Medusa `/store/products` (pricing, variants, stock) |
| Product content (copy, images, SEO) | Sanity GROQ |
| Blog, marketing, legal pages | Sanity GROQ |
| Customer auth | Medusa store auth |
| Vendor access point | Sanity Studio redirect |

### Never In fas-cms-fresh
- ❌ No commerce record storage
- ❌ No price calculation
- ❌ No inventory tracking
- ❌ No Sanity writes for commerce data (exception: `complete-order` writes non-authoritative order snapshot)

---

## Key Env Vars

```
MEDUSA_BACKEND_URL=https://api.fasmotorsports.com
PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_...   ← NEEDS ROTATION (returns 400 currently)
SANITY_PROJECT_ID=r4og35qd
SANITY_DATASET=production
SANITY_STUDIO_URL=https://fassanity.fasmotorsports.com
STRIPE_SECRET_KEY=sk_...
SHIPPO_API_KEY=shippo_...
```
