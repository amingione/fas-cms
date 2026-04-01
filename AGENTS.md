# FAS CMS Fresh - AGENTS.md

## Canonical Authority

- Global architecture authority: `/Users/ambermin/LocalStorm/Workspace/DevProjects/GitHub/fas-sanity/AGENTS.md`
- Global task tracker: `/Users/ambermin/LocalStorm/Workspace/DevProjects/GitHub/fas-sanity/docs/governance/FAS_4_REPO_PIPELINE_TASK_TRACKER.md`

If this file conflicts with canonical authority, canonical authority wins.

## Repo Role

fas-cms-fresh is the customer storefront UI and API consumer.

- Reads and mutates commerce state through Medusa.
- May consume Sanity content for enrichment/presentation.
- Must not own pricing, inventory, checkout, order, payment, or shipping authority.

## Non-Negotiable Rules

- No direct Stripe commerce flows in storefront checkout paths.
- No direct Shippo commerce flows.
- No parallel commerce invariants computed in storefront runtime.
- Sanity writes from this repo must remain non-transactional.

## Required 4-Repo Pipeline

Sanity (content) -> Medusa (commerce authority) -> fas-cms-fresh (storefront) and fas-dash (ops) -> Stripe/Shippo via Medusa.

## Governance Requirement

All architecture-sensitive storefront changes must map to tracker IDs in the canonical task tracker.

## SEO Redirect Safety (Mandatory)

- Canonical storefront page URLs are slash-suffixed (example: `/warranty/`).
- Redirect rules must never self-target on 3xx statuses (for example `from="/warranty/"` and `to="/warranty/"` with `301`), because this creates infinite redirect loops in production.
- Enforcement commands:
  - `npm run seo:check:category-slashes`
  - `npm run seo:check:netlify-self-redirects`
