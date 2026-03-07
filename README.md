# FAS Storefront (`fas-cms-fresh`)

DOCS_VERSION: v2026.03.07  
Role: Customer-facing storefront

## Purpose
`fas-cms-fresh` is the storefront UI layer for customers.

It is responsible for:
- product discovery and PDP rendering
- cart and checkout UX
- customer-facing order flow UI

It is not commerce authority.

## System boundaries
- `fas-medusa` = commerce source of truth
- `fas-dash` = internal operations/admin UI
- `fas-cms-fresh` = storefront UI only
- Stripe = payment processor only
- Sanity = content/editorial only

## Authority rules
- Storefront must read authoritative product/price/inventory/cart/checkout state from Medusa-backed flows.
- Storefront must not authoritatively compute totals, tax, shipping, or order state.
- Sanity may enrich content, but cannot block Medusa-valid commerce rendering.

## Canonical runtime flow
PDP -> canonical cart -> Medusa cart -> PaymentIntent -> Stripe webhook -> Medusa order

## Canonical docs
- `docs/governance/checkout-architecture-governance.md`
- `docs/governance/commerce-authority-checklist.md`
- `docs/architecture/canonical-commerce-architecture.md`
- `docs/architecture/migration-status.md`

## Commands
Use existing scripts in `package.json`.

Common checks:
- `yarn env:check:local`
- `yarn env:check:netlify`
- `yarn docs:check`
