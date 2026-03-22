# Architecture — Verified Stack Details

All details below are verified from codebase inspection unless marked NEEDS CONFIRMATION.

## System Overview

```
┌─────────────────────────────────────────────────────┐
│                    Customer Browser                  │
│  ┌───────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │ Astro SSR │  │ React    │  │ gtag.js (GA4 +   │ │
│  │ Pages     │  │ Islands  │  │ Google Ads)      │ │
│  └─────┬─────┘  └────┬─────┘  └────────┬─────────┘ │
└────────┼──────────────┼─────────────────┼───────────┘
         │              │                 │
         ▼              ▼                 ▼
┌─────────────────┐  ┌──────────┐  ┌──────────────┐
│ BFF API Routes  │  │ Sanity   │  │ GA4 Property │
│ (src/pages/api/)│  │ (Content)│  │ G-NQ94Z6HWGV │
│ 102 routes      │  │ r4og35qd │  └──────────────┘
└────────┬────────┘  └──────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌────────┐
│ Medusa │ │ Stripe │
│ (api.  │ │        │
│ fas..) │ │        │
└────────┘ └───┬────┘
               │
               ▼
         ┌───────────┐
         │ Stripe    │
         │ Webhooks  │
         │ → Medusa  │
         └───────────┘
```

## Astro Frontend

- **Framework:** Astro 5.18.0 with `@astrojs/react` for interactive islands
- **Hosting:** Netlify (`@astrojs/netlify` adapter 6.6.4)
- **Pages:** 143 Astro pages
- **Components:** ~150 React component files (~29K LOC)
- **Styling:** Tailwind CSS 3.4.17 + Radix UI primitives
- **Source:** `src/pages/`, `src/components/`, `src/layouts/`

### Key Layout
- `src/layouts/BaseLayout.astro` — loads GA4 gtag.js, Google Ads, Ahrefs analytics, DNS prefetch

### Cart State (NOT nanostores)
- **React Context:** `src/components/cart/cart-context.tsx`
- **localStorage:** `src/lib/cart.ts`
- **Sync:** Custom `cart:changed` DOM event + `syncMedusaCart()` function
- **Note:** CLAUDE.md mentions nanostores but codebase uses React Context + localStorage

## Sanity CMS (Content Only)

- **Project ID:** `r4og35qd`
- **Dataset:** `production`
- **API Version:** `2025-10-22`
- **Studio URL:** `https://fassanity.fasmotorsports.com`
- **Schemas:** 11 document types (see [data-dictionary.md](./data-dictionary.md))
- **Config:** `sanity/schemas/` directory
- **Client:** `@sanity/client` 7.13.2, `@sanity/astro` 3.2.11

### Authority Rule
Sanity is content-only. Never queried for price, inventory, or commerce data.

## Medusa (Commerce — Authoritative)

- **Backend URL:** `https://api.fasmotorsports.com` (prod) / `http://localhost:9000` (dev)
- **Auth:** Publishable API key via `x-publishable-api-key` header
- **Region ID:** Configurable via `MEDUSA_REGION_ID`
- **Repo:** fas-medusa (separate repository)

### BFF API Routes (fas-cms → Medusa)

| Route | Purpose |
|-------|---------|
| `/api/medusa/cart/create.ts` | Create new Medusa cart |
| `/api/medusa/cart/add-item.ts` | Add item to cart |
| `/api/medusa/cart/update-address.ts` | Update shipping/billing address |
| `/api/medusa/cart/shipping-options.ts` | Get shipping rates (via Shippo) |
| `/api/medusa/cart/select-shipping.ts` | Select shipping option |
| `/api/medusa/cart/discount-code.ts` | Apply discount code |
| `/api/medusa/payments/create-intent.ts` | Create Stripe PaymentIntent via Medusa |
| `/api/cart/[id].ts` | Fetch cart by ID |
| `/api/orders/[id].ts` | Get order details |
| `/api/orders/by-payment-intent.ts` | Lookup order by PaymentIntent ID |
| `/api/complete-order.ts` | Complete order (Medusa + Sanity write) |

### Deprecated Routes
| Route | Status |
|-------|--------|
| `/api/medusa/webhooks/payment-intent.ts` | 410 Gone — webhooks routed to fas-medusa |
| `/api/update-payment-intent.ts` | 410 Gone |

## Stripe (Payments)

- **API Version:** `2025-08-27.basil` (configurable via `STRIPE_API_VERSION`)
- **Client SDK:** `@stripe/stripe-js` 8.6.1, `@stripe/react-stripe-js` 5.4.1
- **Server SDK:** `stripe` 20.1.0
- **Config:** `src/lib/stripe-config.ts`

### Payment Flow
1. Frontend → `POST /api/medusa/payments/create-intent` (with cartId)
2. BFF → Medusa `POST /store/payment-intents`
3. Medusa creates Stripe PaymentIntent, returns `client_secret`
4. Frontend initializes Stripe Elements (`<PaymentElement>`)
5. Customer submits → `stripe.confirmPayment()`
6. Stripe webhook → `api.fasmotorsports.com/webhooks/stripe` (fas-medusa, NOT fas-cms)

## Analytics (Current State)

### GA4 — Client-Side
- **Measurement ID:** `G-NQ94Z6HWGV` (overridable via `PUBLIC_GA_MEASUREMENT_ID`)
- **Loaded in:** `src/layouts/BaseLayout.astro`
- **Implementation:** gtag.js (not GTM container)
- **Events fired:** `page_view` only (default gtag config)
- **Enhanced ecommerce:** NOT implemented

### Google Ads
- **Conversion ID:** `AW-17641771829` (overridable via `PUBLIC_GOOGLE_ADS_ID`)
- **Loaded alongside:** GA4 in same gtag config call

### GA4 — Server-Side (Read-Only)
- **File:** `src/lib/analytics/googleAnalytics.ts`
- **Purpose:** Read GA4 data for SEO dashboard (`admin/seo-dashboard.astro`)
- **Auth:** Google Service Account JWT
- **Metrics read:** sessions, pageviews, avg session duration, engagement rate (30-day)
- **Note:** This is read-only reporting, NOT event ingestion

### Ahrefs
- **Script:** `https://analytics.ahrefs.com/analytics.js`
- **Loaded in:** `src/layouts/BaseLayout.astro`

## Shipping (Shippo)

- **API Key:** `SHIPPO_API_KEY`
- **Integration:** `src/pages/api/medusa/cart/shipping-options.ts`
- **Warehouse config:** Address env vars for origin

## Email (Resend)

- **Service:** Resend (`resend` 4.8.0)
- **API Key:** `RESEND_API_KEY`
- **From addresses:** `RESEND_FROM` (customer), `RESEND_VENDOR_FROM` (vendor)

## Scheduling (Cal.com)

- **API Key:** `CALCOM_API_KEY` (configured in .env.example)
- **Webhook Secret:** `CALCOM_WEBHOOK_SECRET`
- **Status:** NEEDS CONFIRMATION — extent of current Cal.com integration unclear

## Other Integrations

- **Mapbox:** Address lookup in checkout (`CheckoutForm.tsx`)
- **Firehose:** Brand mention monitoring service (env vars configured)
- **Google Merchant Center:** Product feed generation (SFTP-based sync)
