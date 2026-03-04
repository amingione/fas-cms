# CLAUDE.md — fas-cms-fresh

## Role
Astro storefront — public customer UI, BFF API layer, login portal (customers + vendors).
**This repo renders. It does NOT own commerce data.**

## Stack
- Astro + TypeScript + React Islands
- Nanostores (shared cart/auth state)
- Netlify (hosting + functions)

## Architecture Rules
- All product/cart/order/pricing/inventory data → Medusa at `https://api.fasmotorsports.com`
- All content (copy, blog, marketing pages) → Sanity `r4og35qd / production`
- Checkout orchestration lives in BFF routes (`src/pages/api/`)
- Never call Sanity for price or inventory
- Never own or store commerce records

## BFF API Routes (Key)
| Route | Orchestrates |
|-------|-------------|
| /api/create-payment-intent | Stripe + Medusa |
| /api/shipping-rates | Shippo + Medusa |
| /api/update-payment-intent | Stripe |
| /api/cart/[id] | Medusa cart proxy |
| /api/complete-order | Medusa order creation + Sanity write |

## Key Env Vars
```
MEDUSA_BACKEND_URL=https://api.fasmotorsports.com
PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_...
SANITY_PROJECT_ID=r4og35qd
SANITY_STUDIO_URL=https://fassanity.fasmotorsports.com
STRIPE_SECRET_KEY=...
SHIPPO_API_KEY=...
```

## Current State (2026-03-04)
- ✅ Checkout flow live (Stripe + Shippo + Medusa BFF)
- ✅ Stripe webhook ingress deployed (fas-webhook-ingress-20260211.netlify.app)
- ⚠️ 6 legacy routes flagged for migration to /store/* pattern

## Active Patterns
```typescript
// Medusa store call (from Astro API route)
const res = await fetch(`${MEDUSA_BACKEND_URL}/store/products`, {
  headers: { 'x-publishable-api-key': PUBLIC_MEDUSA_PUBLISHABLE_KEY }
})

// Sanity GROQ (content only)
const content = await sanityClient.fetch(`*[_type == "post" && slug.current == $slug][0]`, { slug })
```

## Checkout Flow
1. Customer fills cart → `checkout.astro` mounts `CheckoutForm.tsx` (React island)
2. CheckoutForm calls `/api/create-payment-intent` → BFF calls Stripe + Medusa
3. Stripe Elements renders → customer submits
4. BFF calls `/api/complete-order` → Medusa creates order
5. Stripe webhook `payment_intent.succeeded` → ingress site → Medusa confirm

## Vendor Portal
- Vendors log in via separate auth flow (not customer auth)
- Vendor workspace lives in fas-sanity Studio
- fas-cms-fresh is the access point only
