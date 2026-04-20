# FAS CMS Fresh - AGENTS.md

## Canonical Authority

- Global architecture authority: `/Users/ambermin/LocalStorm/Workspace/DevProjects/GitHub/fas-sanity/AGENTS.md`
- Global task tracker: `/Users/ambermin/LocalStorm/Workspace/DevProjects/GitHub/fas-sanity/docs/governance/FAS_4_REPO_PIPELINE_TASK_TRACKER.md`

If this file conflicts with canonical authority, canonical authority wins.

## Symlink Registry — CRITICAL

The following paths in this repo are **symlinks to fas-sanity** (the canonical source). Do NOT create regular files at these paths. Any write goes through to fas-sanity automatically. To update, edit in fas-sanity.

Symlinked paths: `docs/governance/RELEASE_CHECKLIST.md`, `docs/governance/FAS_4_REPO_PIPELINE_TASK_TRACKER.md`, `docs/architecture/canonical-commerce-architecture.md`, `docs/architecture/migration-status.md`, `docs/architecture/schema-authority-checklist.yml`, `docs/ai-governance.md`, `docs/ai-governance/AI_TASK_RUNBOOK.MD`, `docs/ai-governance/GOVERNANCE_MAKE_COMMANDS.md`, `docs/ai-governance/HOW_WE_FIX_BUGS.md`, `docs/ai-governance/Makefile.template`, `docs/ai-governance/PROD_IDENTIFICATION_RULES.md`, `docs/ai-governance/System_Architecture_And_API_Reference.md`, `docs/ai-governance/ai-governance.md`, `docs/ai-governance/contracts/` (dir), `docs/ai-governance/guards/` (dir), `docs/ai-governance/templates/` (dir), `docs/system/SANITY_MEDUSA_CONTRACT.md`.

Full registry with edit locations: see `fas-sanity/AGENTS.md` → "Cross-Repo Symlink Registry" section.

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
- **Critical — trailing-slash variant:** Netlify normalizes trailing slashes before matching `_redirects`. A rule like `/shop/foo → /shop/foo/` (301) loops identically to `/shop/foo → /shop/foo` because `/shop/foo/` is treated as `/shop/foo` at match time. The middleware in `src/middleware.ts` issues a 308 at the SSR layer — that is the correct and only enforcement point. Do NOT add trailing-slash redirect entries to `public/_redirects`.
- Enforcement commands (also run by the pre-commit hook):
  - `npm run seo:check:category-slashes`
  - `npm run seo:check:netlify-self-redirects`

## Locked Files — Do Not Modify Without Amber's Explicit Approval

The following files have been locked due to a production redirect loop incident (2026-04-20). Any AI agent (Codex, Claude, Copilot) must treat these as read-only unless Amber explicitly instructs a change in the task description:

- `public/_redirects` — CODEOWNERS gate + pre-commit hook enforced
- `netlify.toml` — CODEOWNERS gate enforced

If you believe a change is necessary, stop and ask Amber before touching these files.
