# Codex Guidance (`fas-cms-fresh`)

DOCS_VERSION: v2026.03.07

This file is storefront-specific agent guidance.

## Authority model
- Commerce authority: `fas-medusa`
- Storefront role: UI + API consumer
- Stripe role: payment processor only
- Sanity role: content only

## Enforced storefront rules
- Do not introduce direct Stripe catalog/checkout authority into storefront runtime.
- Do not introduce Sanity as order/cart/checkout authority.
- Product price/availability/cart/checkout must come from Medusa-authoritative flows.
- Sanity enrichment is optional and non-blocking for commerce-critical rendering.

## Canonical references
- `docs/governance/checkout-architecture-governance.md`
- `docs/governance/commerce-authority-checklist.md`
- `docs/architecture/canonical-commerce-architecture.md`
- `docs/architecture/migration-status.md`

## Archived note
Legacy Codex guidance has been archived at:
- `docs/archive/2026-03-07/codex.legacy.md`
