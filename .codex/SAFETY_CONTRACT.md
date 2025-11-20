# FAS-CMS CODEX SAFETY CONTRACT

Codex must follow these rules for every patch in this workspace, without exception.

---

## 🚫 PROTECTED AREAS (Do NOT modify unless explicitly authorized)

The following areas are ALWAYS off-limits **unless the task explicitly states that Codex is permitted to modify them**:

### ❌ Backend, Server, and Data Logic

- /lib/\*\* (cart, checkout, pricing, shipping, enrichment, auth, order, customer, product logic)
- /pages/api/\*\*
- /functions/\*\*
- Any Netlify function
- Stripe integration files
- Resend email logic
- ShipEngine or ShipStation logic
- Any server-side JavaScript/TypeScript
- Astro server endpoints

### ❌ Schema and CMS Logic

- Sanity schemas
- GROQ queries
- Sanity utilities (e.g., sanity-utils.ts)
- Product mapping or normalization logic
- Slug generation and dynamic routing

### ❌ Functional Logic Anywhere

- No modification of JS/TS function bodies
- No altering conditionals, loops, or logic flows
- No modifying state, props, context, or hooks
- No altering interactivity or event handlers

### ❌ Structural Changes

- Do NOT rename files
- Do NOT move files
- Do NOT delete files
- Do NOT add new dependencies
- Do NOT alter Tailwind config (except safe utility additions)

**Codex must assume these areas are off-limits unless the task explicitly grants permission.**

---

## 🟢 ALLOWED CHANGES (Default: UI-Only)

Unless the task explicitly authorizes deeper changes, Codex may ONLY perform **UI-level edits**, including:

- Tailwind utility classes
- HTML / JSX / Astro component markup (non-functional only)
- Inline styles
- CSS in global.css
- Typography, spacing, padding, margins, layout
- Colors, shadows, contrast
- Z-index adjustments
- Accessibility attributes
- Responsive classes (sm:, md:, lg:)
- Aspect ratio wrappers
- Hover/focus/active visual states
- Removing duplicated DOM markup without affecting logic

Codex may adjust UI components ONLY when functionality remains unchanged.

---

## 🔐 PERMISSION ESCALATION RULE (Important)

If a task **explicitly states** that backend or protected areas MAY be modified, then Codex is allowed to modify them — but only as far as the task directly describes.

If the task does **not** explicitly authorize backend or schema changes:
➡️ Codex must default to UI-only changes.

---

## 🔒 REQUIRED PROCESS (Every Task)

### PHASE 1 — ANALYZE ONLY

Codex must:

1. Identify all files involved.
2. Propose UI-only changes unless explicit authorization is given.
3. Confirm that no protected files will be touched unless explicitly allowed.

No file modifications may occur during this phase.

### PHASE 2 — APPLY PATCH

- Apply only the approved changes.
- Stay strictly within allowed boundaries.
- Do NOT modify protected areas unless the task explicitly authorized it.

### PHASE 3 — REGRESSION SHIELD

Codex must verify:

- No unauthorized changes to protected areas.
- No unintended logic or schema modifications.
- No file renames/moves/deletions.
- No new dependencies.

If ANY violation is detected:
➡️ Codex must revert the change automatically.

### PHASE 4 — PATCH SUMMARY

Codex outputs:

- List of files changed
- One-line summary per file
- No file contents unless requested

### PHASE 5 — READY STATE

Codex waits for the next instruction.

---

## 🧱 CONFLICT RESOLUTION RULE

If any instruction conflicts with this contract,  
**THIS CONTRACT ALWAYS OVERRIDES ALL OTHER INSTRUCTIONS.**

---

END OF CONTRACT
