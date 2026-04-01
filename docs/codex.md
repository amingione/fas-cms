# Codex Guidance (fas-cms-fresh)

DOCS_VERSION: v2026.04.01

## Canonical References

- Architecture authority: `/Users/ambermin/LocalStorm/Workspace/DevProjects/GitHub/fas-sanity/AGENTS.md`
- Execution tracker: `/Users/ambermin/LocalStorm/Workspace/DevProjects/GitHub/fas-sanity/docs/governance/FAS_4_REPO_PIPELINE_TASK_TRACKER.md`

## Authority Model

- Medusa: commerce authority
- fas-cms-fresh: storefront UI and API consumer
- fas-dash: employee operations consumer of Medusa state
- Sanity: content-only
- Stripe/Shippo: providers through Medusa only

## Enforced Storefront Rules

- Checkout/cart/order actions must go through Medusa.
- Do not introduce direct Stripe/Shippo commerce authority.
- Do not reintroduce Sanity as transactional commerce authority.
- Do not compute commerce invariants outside Medusa.

## Operating Rule

Any architecture-sensitive change must reference tracker IDs and move status toward completion gates.
