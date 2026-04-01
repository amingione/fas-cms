# AI Coding Agent Guidelines for FAS CMS Fresh

## Canonical Authority

- Architecture authority: `/Users/ambermin/LocalStorm/Workspace/DevProjects/GitHub/fas-sanity/AGENTS.md`
- Task tracker: `/Users/ambermin/LocalStorm/Workspace/DevProjects/GitHub/fas-sanity/docs/governance/FAS_4_REPO_PIPELINE_TASK_TRACKER.md`

If any instruction conflicts with AGENTS.md, AGENTS.md wins.

## 4-Repo Architecture (Required)

- fas-medusa: commerce authority
- fas-cms-fresh: storefront UI and API consumer
- fas-dash: employee operations consumer
- fas-sanity: content and marketing only
- Stripe/Shippo: commerce providers via Medusa only

## Hard Rules

- No direct Stripe checkout authority in storefront flows.
- No direct Shippo shipping authority in storefront flows.
- No pricing, inventory, cart, checkout, order, payment, or shipping invariants outside Medusa.
- Sanity must not be treated as transactional commerce authority.

## Allowed Scope by Default

- UI and rendering updates
- Content presentation
- API consumption of Medusa and Sanity

## Escalation Conditions

Stop and request explicit approval when change requests imply:

- New commerce authority outside Medusa
- New direct Stripe/Shippo checkout paths
- Schema or backend behavior changes without contract decisions

## Completion Discipline

All cross-repo architecture work must map to tracker IDs and include status updates.
