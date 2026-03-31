# FAS CMS Fresh — AGENTS.md

**Governing authority**: `fas-sanity/AGENTS.md` is the canonical source of truth for all
commerce architecture decisions. This file is the repo-specific supplement.

> **If this file conflicts with `fas-sanity/AGENTS.md`, fas-sanity/AGENTS.md wins.**

---

## Role in the FAS Ecosystem

| Layer       | This repo                                                     |
|-------------|---------------------------------------------------------------|
| Framework   | Astro + React Islands (Netlify)                               |
| Role        | Storefront UI + API BFF — consumes Medusa & Sanity, renders nothing |
| Auth        | Session-based; vendor portal uses `requireVendor()`           |
| State       | Nanostores for cart/auth; no Redux, no Zustand                |

---

## Non-Negotiable Rules (inherited from fas-sanity/AGENTS.md)

1. **No direct Stripe calls** from storefront API routes (`src/pages/api/`)
   - All payment intents must originate or proxy through Medusa `/store/*`
   - **Exception**: The vendor portal (`/vendor/` routes) uses Stripe for B2B invoice
     payments. These are wholesale billing flows, not customer checkout orders.

2. **No direct Shippo calls** — shipping options come from Medusa `/store/carts/:id/shipping-options`

3. **Sanity writes are content-only** — acceptable writes: bookings, contact forms,
   reviews, quotes, vendor CRM/settings, wholesale POs. Never write order status,
   payment records, or fulfillment state to Sanity.

4. **Medusa is the commerce engine** — cart, checkout, orders, pricing, inventory all
   read/write via `medusaFetch()` against `https://api.fasmotorsports.com`

5. **Flow logging required** — all BFF API routes that touch Medusa must wrap calls
   with `withFlowLog()` from `src/lib/logger.ts`

---

## Accepted Architectural Exceptions

### Vendor Portal (B2B)
- `/src/pages/api/vendor/*` — Vendor portal routes may use Stripe directly for
  **invoice retrieval only** (`paymentIntents.retrieve`). No `paymentIntents.create`
  or `checkout.sessions.create` is permitted.
- Vendor wholesale orders (`WO-` prefix) are stored in Sanity as CRM workflow
  documents, not as Medusa commerce orders. This is intentional.

### Sanity Writes (Allowed)
- `bookings/create.ts` — appointment booking content
- `contact.ts` — contact form submissions
- `custom-fab-inquiry.ts` / `form-submission.ts` — lead capture
- `wheel-quote-*.ts` / `save-quote.ts` — quote documents
- `vendors/create-order.ts` — wholesale PO documents (B2B CRM, not commerce orders)
- `vendor/settings/*` — vendor profile/settings
- `reviews/submit.ts` — product review content
- `attribution/track.ts` — marketing attribution

---

## Key Files

```
src/lib/
  logger.ts          — Flow logger + FAILURE_MAP (withFlowLog, logFlow)
  medusa-fetch.ts    — Authenticated Medusa store fetch utility
  stripe-config.ts   — Stripe API version constant (no instantiation here)

src/server/
  sanity-client.ts   — Read-only Sanity client for content fetches
  vendor-portal/
    auth.ts          — requireVendor() — JWT auth for vendor portal

src/pages/api/
  cart/              — All cart ops via Medusa /store/carts/*
  checkout/          — Checkout flow via Medusa
  vendor/            — B2B vendor portal (exception: Stripe invoice retrieve)
```

---

## Local Dev

```bash
npm run dev          # Astro dev server
npm run compliance:check   # Run cross-repo compliance check
```

---

*Last updated by AI governance system — $(date -u +%Y-%m-%d)*
