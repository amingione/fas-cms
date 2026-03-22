# Memory — Working Notes for Claude Code

Last updated: 2026-03-22

## Verified Stack Facts

| Component | Detail | Source |
|-----------|--------|--------|
| Frontend | Astro 5.18.0 + React 18.3.1 islands | `package.json` |
| CMS | Sanity (project `r4og35qd`, dataset `production`) | `sanity/schemas/`, `.env.example` |
| Commerce | Medusa at `https://api.fasmotorsports.com` | `src/pages/api/medusa/` |
| Payments | Stripe (API version `2025-08-27.basil`) | `src/lib/stripe-config.ts` |
| Hosting | Netlify with functions | `@astrojs/netlify` adapter |
| Shipping | Shippo | `src/pages/api/medusa/cart/shipping-options.ts` |
| Email | Resend | `package.json`, `.env.example` |
| Analytics (GA4) | `G-NQ94Z6HWGV` via gtag.js (NOT GTM) | `src/layouts/BaseLayout.astro` |
| Analytics (Ads) | `AW-17641771829` | `src/layouts/BaseLayout.astro` |
| Analytics (SEO) | Ahrefs analytics.js | `src/layouts/BaseLayout.astro` |
| Scheduling | Cal.com (API key configured) | `.env.example` |
| Cart state | React Context + localStorage (NOT nanostores) | `src/components/cart/cart-context.tsx` |

## Authoritative Files

| Purpose | File |
|---------|------|
| GA4/Ads loading | `src/layouts/BaseLayout.astro` |
| Cart actions | `src/components/cart/actions.ts` |
| Add to cart UI | `src/components/cart/add-to-cart.tsx` |
| Cart context | `src/components/cart/cart-context.tsx` |
| Checkout form | `src/components/checkout/CheckoutForm.tsx` |
| Stripe config | `src/lib/stripe-config.ts` |
| Cart lib | `src/lib/cart.ts` |
| GA4 server-side read | `src/lib/analytics/googleAnalytics.ts` |
| Payment intent | `src/pages/api/medusa/payments/create-intent.ts` |
| Order completion | `src/pages/api/complete-order.ts` |
| Order confirmation | `src/pages/order/confirmation.astro` |
| Sanity schemas | `sanity/schemas/*.ts` |
| Env vars reference | `.env.example` |

## Naming Conventions

| Context | Convention | Example |
|---------|-----------|---------|
| Sanity schema files | camelCase | `quoteRequest.ts`, `vendorReturn.ts` |
| API routes | kebab-case paths | `/api/medusa/cart/add-item.ts` |
| React components | PascalCase | `CheckoutForm.tsx`, `ProductCard.tsx` |
| Task IDs | `P{phase}-{number}` | `P1-001`, `P2-003` |

## GA4 Event Names (Planned)

| Event | Client/Server | Source Component | Status |
|-------|--------------|-----------------|--------|
| `page_view` | Client (gtag default) | BaseLayout.astro | Active |
| `view_item` | Client (GTM) | Product pages, QuickView | NOT implemented |
| `add_to_cart` | Client (GTM) | cart/actions.ts | NOT implemented |
| `begin_checkout` | Client (GTM) | CheckoutForm.tsx | NOT implemented |
| `purchase` | Client (GTM) | order/confirmation.astro | NOT implemented |
| `purchase` | Server (Measurement Protocol) | fas-medusa events | NOT implemented |

## Data Mappings

| GA4 Parameter | Medusa Source | Notes |
|---------------|-------------|-------|
| `item_id` | `variant_id` | Use variant, not product ID |
| `item_name` | `product.title` | |
| `price` | Variant calculated price | |
| `transaction_id` | Medusa order ID | Also used as `event_id` for dedup |
| `currency` | Region currency | Default `USD` |

## Open Questions

1. **Medusa server-side events:** Does fas-medusa emit `order.placed` or equivalent events? Need to check fas-medusa repo.
2. **GTM container:** Is there an existing GTM container, or does one need to be created?
3. **WooCommerce:** What is the current state of the legacy WooCommerce store?
4. **Cal.com integration:** How deep is the current Cal.com integration beyond API key configuration?
5. **Nanostores discrepancy:** CLAUDE.md mentions nanostores but codebase uses React Context. Which is correct going forward?
6. **Medusa customer metadata:** What metadata fields are available on Medusa customer records for storing vehicle profiles?
7. **GA4 Measurement Protocol API secret:** Has one been generated in GA4 Admin?
