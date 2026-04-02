# fas-cms — Repo Governance

**Role in Pipeline:** Customer storefront UI (Astro + Sanity)
**Last Updated:** 2026-04-02

---

## This Repo's Responsibility

fas-cms (also known as fas-cms-fresh) is the customer-facing storefront. It consumes Medusa for all commerce data and does NOT own any commerce authority.

```
Sanity (content) → Medusa (commerce) → fas-cms-fresh + fas-dash → Stripe/Shippo via Medusa
```

## What This Repo Does

- Customer-facing product catalog, PDPs, checkout UI
- Reads product content from Sanity (content enrichment only — no pricing)
- Reads pricing, inventory, cart state exclusively from Medusa /store/* endpoints
- Reads/writes cart and checkout state through Medusa only

## What This Repo Must NOT Do

- Call Stripe SDK directly (all payments through Medusa)
- Call Shippo SDK directly (all shipping through Medusa)
- Own or persist pricing, inventory, or order state
- Expand the legacy checkout routes (they are 410 GONE)

## Authority Boundary Status (2026-04-02)

- ✅ Legacy routes 410 GONE: complete-order.ts, update-payment-intent.ts, cart.ts
- ✅ Storefront pricing: medusa-storefront-pricing.ts uses medusaFetch only — no Sanity price fields consumed for pricing decisions
- ✅ Search: attachMedusaPricingBySanityIdentity resolves all display prices from Medusa
- ✅ No direct Stripe SDK usage anywhere in repo
- ✅ No direct Shippo SDK usage anywhere in repo
- ✅ stripe-config.ts exports API version string constant only (no SDK instantiation)

## Key Files

- `src/lib/medusa.ts` — medusaFetch() utility for /store/* endpoints
- `src/lib/medusa-storefront-pricing.ts` — Medusa-only pricing resolution
- `src/lib/stripe-config.ts` — API version constant only (no SDK)
- `src/pages/api/complete-order.ts` — 410 GONE
- `src/pages/api/update-payment-intent.ts` — 410 GONE
- `src/pages/api/cart.ts` — 410 GONE (legacy Sanity cart)

## Cross-Repo Governance

- **Canonical tracker:** `docs/governance/FAS_4_REPO_PIPELINE_TASK_TRACKER.md` (synced from fas-dash)
- **Release checklist:** `docs/governance/RELEASE_CHECKLIST.md` (synced from fas-dash)
- **Architecture authority:** fas-sanity/AGENTS.md
