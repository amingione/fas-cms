# Codex-Only Bootstrap Contract Decisions (fas-cms)

Issue: codex-only-bootstrap
Repo: fas-cms
Date: 2025-12-27

## Authority statement
- fas-sanity remains authoritative for schema definitions; fas-cms is a consumer runtime.
- Codex is the sole agent authorized to produce governance artifacts and enforcement changes for this issue.

## Allowed change scope (future enforcement)
- Runtime validation at approved boundaries in `src/pages/api/**` and `src/server/**`.
- Validation helpers in existing validation modules (no new dependencies).
- Documentation and governance artifacts under `docs/ai-governance/**`, `docs/prompts/**`, `docs/reports/**`.

## Forbidden changes
- Any modification to Sanity schemas or schema types (owned by fas-sanity).
- Any business-logic changes beyond validation (no behavior changes beyond rejecting/guarding invalid inputs).
- Any new dependencies or runtime frameworks.
- Any changes to fas-sanity or shared schema authority boundaries.

## File boundaries (contract)
- Runtime API boundary: `src/pages/api/**`.
- Runtime Sanity boundary: `src/server/sanity/**` and `src/server/sanity-client.ts`.
- Stripe integration boundary: `src/pages/api/checkout.ts`, `src/pages/api/webhooks.ts`.
- Governance artifacts: `docs/ai-governance/**`, `docs/prompts/**`, `docs/reports/**`.

## Codex authority rules
- Codex-only execution; no Gemini/Claude involvement for audits, decisions, or enforcement.
- Enforcement must use `Zod.safeParse()` for validation; do not use `parse()`.
- Enforcement must not modify schema definitions or data models; only runtime guards.
- If a change risks altering runtime behavior beyond validation, stop and request explicit approval.
