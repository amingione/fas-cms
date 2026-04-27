# FAS Storefront — `fas-cms-fresh`

**DOCS_VERSION:** `v2026.04.26`  
**Role:** Current live storefront during the Vendure transition

## Status at a glance

`fas-cms-fresh` is the **current live production storefront** for FAS Motorsports.

It remains live until `fas-vendure/apps/web` is fully validated and explicitly approved for cutover.

## What this repo is today

- Customer-facing storefront UI
- Current live PDP/cart/checkout surface
- Production storefront paired with `fas-medusa`

## What this repo is not

- Not the long-term replacement architecture
- Not the future commerce authority
- Not the place for new platform direction when the work belongs in `fas-vendure`

## System boundaries

| Concern | Current owner |
|---|---|
| Live storefront traffic | `fas-cms-fresh` |
| Live commerce authority | `fas-medusa` |
| Live ops/admin | `fas-dash` |
| Content/editorial authority | `fas-sanity` |
| Replacement storefront path | `fas-vendure/apps/web` |

## Working rule during transition

This repo is still production-critical, so revenue-protecting fixes and parity updates are valid here while cutover is pending.

At the same time, the **target architecture is `fas-vendure`**, so do not introduce new long-term architecture that conflicts with the replacement path.

## Authority rules

- Storefront must read authoritative product, price, inventory, cart, and checkout state from `fas-medusa` **while this repo remains live**
- Storefront must not become a separate commerce authority
- Sanity may enrich content, but is not the transactional commerce system

## Replacement path

This repo is planned to be replaced by `fas-vendure/apps/web` after:

1. Checkout is proven end to end in Vendure
2. Customer auth is working
3. Deployment behavior is stable
4. Launch approval is given

## Canonical docs

- `README.md` for current-repo role
- `docs/governance/checkout-architecture-governance.md`
- `docs/governance/commerce-authority-checklist.md`
- `docs/architecture/migration-status.md`
- `../fas-vendure/docs/FAS_MASTER_PLAN.md` for target-state architecture

## Commands

Use existing scripts in `package.json`.

## Package manager policy

- Yarn 4 is canonical for this repo
- Use `yarn install` and `yarn <script>`
- Do not use `npm install`

