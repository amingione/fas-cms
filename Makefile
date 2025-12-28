# =========================================================
# AI Governance — fas-cms
# =========================================================

.PHONY: new-ai-cycle verify-enforcement

new-ai-cycle:
	@if [ -z "$(ISSUE)" ]; then \
		echo "❌ ISSUE not specified. Usage: make new-ai-cycle ISSUE=example-issue"; \
		exit 1; \
	fi
	@echo "🧠 Initializing AI governance cycle for: $(ISSUE)"
	@mkdir -p docs/prompts docs/reports
	@cp docs/ai-governance/templates/gemini-audit.template.txt docs/prompts/gemini-$(ISSUE)-audit.txt
	@sed -i '' "s/<issue>/$(ISSUE)/g" docs/prompts/gemini-$(ISSUE)-audit.txt
	@echo "✔ Gemini audit prompt created:"
	@echo "  docs/prompts/gemini-$(ISSUE)-audit.txt"
	@echo ""
	@echo "Next steps:"
	@echo "1. Run Gemini with the generated prompt"
	@echo "2. Save report to docs/reports/$(ISSUE)-audit.md"

verify-enforcement:
	@echo "🔍 POST-ENFORCEMENT VERIFICATION"
	@echo ""
	@echo "Run Gemini using the Post-Enforcement Verification prompt."
	@echo "Verification must confirm:"
	@echo " - Codex changes map 1:1 to approved decisions"
	@echo " - No unapproved logic or validation added"
	@echo " - Runtime behavior matches contract"
	@echo ""
	@read -p "Press ENTER once Gemini returns PASS..."
	@echo ""
	@echo "✔ Post-enforcement verification recorded."

# =========================================================
# Gemini Audit — generic (fas-cms)
# =========================================================

.PHONY: gemini-%-audit

gemini-%-audit:
	@echo "🔍 GEMINI AUDIT: $*"
	@echo ""
	@echo "Run Gemini with the prompt:"
	@echo "  docs/prompts/gemini-$*-audit.txt"
	@echo ""
	@echo "Save output to:"
	@echo "  docs/reports/$*-audit.md"
	@echo ""
	@read -p "Press ENTER once Gemini audit is complete..."
	@echo ""
	@echo "✔ Gemini audit recorded for $*."

# =========================================================
# Post-Enforcement Verification — Gemini
# =========================================================

.PHONY: verify-enforcement

verify-enforcement:
	@echo "🔍 POST-ENFORCEMENT VERIFICATION"
	@echo ""
	@echo "Run Gemini using the Post-Enforcement Verification prompt."
	@echo "Source of truth:"
	@echo "  docs/reports/cross-repo-contract-decisions.md"
	@echo ""
	@echo "Verification must confirm:"
	@echo " - Codex changes map 1:1 to approved decisions"
	@echo " - No unapproved schema or logic changes"
	@echo " - No UX or data drift introduced"
	@echo ""
	@read -p "Press ENTER once Gemini returns PASS..."
	@echo ""
	@echo "✔ Post-enforcement verification recorded."

.PHONY: gemini-expired-orders-audit

gemini-expired-orders-audit:
	@echo "🔍 GEMINI AUDIT: Expired Orders → Customer Mapping"
	@echo ""
	@echo "Source of truth:"
	@echo "  docs/reports/cross-repo-contract-decisions.md"
	@echo ""
	@echo "Gemini must inspect:"
	@echo " - Order schema (expired status handling)"
	@echo " - Customer schema and identity fields"
	@echo " - Order creation logic (Stripe webhook / save-order)"
	@echo " - Customer lookup / creation logic"
	@echo " - Desk Structure queries for Orders and Customers"
	@echo ""
	@echo "❗ Gemini MUST NOT modify files."
	@echo ""
	@echo "Run Gemini with the prompt below."
	@echo "Save output to:"
	@echo "  docs/reports/expired-orders-customer-audit.md"
	@echo ""
	@read -p "Press ENTER once Gemini report is saved..."
	@echo ""
	@echo "✔ Gemini expired-orders audit recorded."

# =========================================================
# Fast Path — Trivial / Non-Contract Changes
# Skips full AI pipeline but enforces safety checks
# =========================================================

.PHONY: fast-path

fast-path:
	@echo "⚡ FAST PATH MODE (Trivial Changes Only)"
	@echo ""
	@echo "Allowed changes:"
	@echo " - UI copy / labels"
	@echo " - Styling / layout"
	@echo " - Comments / docs"
	@echo " - Tests"
	@echo ""
	@echo "NOT allowed:"
	@echo " - Schema changes"
	@echo " - Data model changes"
	@echo " - Integration logic"
	@echo " - Auth / identity logic"
	@echo ""
	@read -p "Confirm this change is TRIVIAL and does not affect contracts (y/N): " CONFIRM; \
	if [ "$$CONFIRM" != "y" ]; then \
		echo "❌ Fast path aborted."; \
		exit 1; \
	fi

	@echo ""
	@echo "▶ Running lint + runtime typecheck..."
	@pnpm lint
	@pnpm exec tsc -p tsconfig.runtime.json

	@echo ""
	@echo "✔ Fast path complete."
	@echo "If this was not truly trivial, you MUST rerun make ai-pipeline."

.PHONY: new-ai-cycle

new-ai-cycle:
	@if [ -z "$(ISSUE)" ]; then \
		echo "❌ ISSUE not specified. Usage: make new-ai-cycle ISSUE=example-issue"; \
		exit 1; \
	fi
	@echo "🧠 Initializing AI governance cycle for: $(ISSUE)"
	@mkdir -p docs/prompts docs/reports
	@cp docs/ai-governance/templates/gemini-audit.template.txt docs/prompts/gemini-$(ISSUE)-audit.txt
	@sed -i '' "s/<issue>/$(ISSUE)/g" docs/prompts/gemini-$(ISSUE)-audit.txt
	@echo "✔ Gemini audit prompt created:"
	@echo "  docs/prompts/gemini-$(ISSUE)-audit.txt"
	@echo ""
	@echo "Next steps:"
	@echo "1. Run: make gemini-$(ISSUE)-audit"
	@echo "2. Run Gemini with the generated prompt"
	@echo "3. Save report to docs/reports/$(ISSUE)-audit.md"

# =========================================================
# Codex Enforcement — Expired Orders Customer Fix
# =========================================================

.PHONY: codex-expired-orders-enforce

codex-expired-orders-enforce:
	@echo "🤖 CODEX ENFORCEMENT: Expired Orders → Customer Linking"
	@echo ""
	@echo "CONTRACT SOURCE OF TRUTH:"
	@echo "  docs/reports/expired-orders-customer-contract-decisions.md"
	@echo ""
	@echo "IMPLEMENTATION SEQUENCE:"
	@echo ""
	@echo "Phase 1: Schema Change (fas-sanity)"
	@echo "  File: packages/sanity-config/src/schemaTypes/documents/abandonedCheckout.ts"
	@echo "  Action: Add customerRef field (reference to customer, weak, read-only)"
	@echo "  Location: After customerEmail field (line 43)"
	@echo ""
	@echo "Phase 2: Logic Change (fas-cms-fresh)"
	@echo "  File: netlify/functions/reprocessStripeSession.ts"
	@echo "  Action: Add customer lookup in expired checkout branch"
	@echo "  Pattern: Copy EXACT logic from non-expired order flow (lines 12-22 per audit)"
	@echo "  Location: BEFORE upsertAbandonedCheckoutDocument call"
	@echo ""
	@echo "CRITICAL CONSTRAINTS:"
	@echo "  ❌ DO NOT modify non-expired order creation logic"
	@echo "  ❌ DO NOT create customers from abandoned checkouts"
	@echo "  ❌ DO NOT make customerRef required (must be optional)"
	@echo "  ❌ DO NOT change existing abandonedCheckout fields"
	@echo ""
	@echo "VALIDATION CHECKLIST:"
	@echo "  □ Schema deployed to Sanity dataset"
	@echo "  □ customerRef field visible in Studio"
	@echo "  □ Logic mirrors existing order pattern exactly"
	@echo "  □ Non-expired orders unchanged (regression test)"
	@echo "  □ Weak reference allows customer deletion"
	@echo ""
	@read -p "Press ENTER to auto-run Codex enforcement..."
	@echo ""
	@echo "▶ Launching Codex (CLI) for enforcement."
	@echo "▶ Contract: docs/reports/expired-orders-customer-contract-decisions.md"
	@echo ""

	@echo "▶ Writing Codex prompt to .codex_prompt.tmp"
	@printf "%s\n" \
	"Apply ONLY the approved changes in:" \
	"docs/reports/expired-orders-customer-contract-decisions.md" \
	"" \
	"Rules:" \
	"- Do NOT modify any files not explicitly approved." \
	"- Do NOT refactor unrelated code." \
	"- If no changes are required, state so explicitly." \
	> .codex_prompt.tmp

	@echo "▶ Running Codex in non-interactive mode"
	@codex "$$(cat .codex_prompt.tmp)" || true

	@rm -f .codex_prompt.tmp

	@echo ""
	@echo "✔ Codex enforcement finished."
	@echo "Next: make verify-enforcement"

# =========================================================
# Post-Enforcement Verification — Gemini
# =========================================================

.PHONY: verify-enforcement

verify-enforcement:
	@echo "🔍 POST-ENFORCEMENT VERIFICATION"
	@echo ""
	@echo "Run Gemini using the Post-Enforcement Verification prompt."
	@echo "Source of truth:"
	@echo "  docs/reports/cross-repo-contract-decisions.md"
	@echo ""
	@echo "Verification must confirm:"
	@echo " - Codex changes map 1:1 to approved decisions"
	@echo " - No unapproved schema or logic changes"
	@echo " - No UX or data drift introduced"
	@echo ""
	@read -p "Press ENTER once Gemini returns PASS..."
	@echo ""
	@echo "✔ Post-enforcement verification recorded."

.PHONY: gemini-expired-orders-audit

gemini-expired-orders-audit:
	@echo "🔍 GEMINI AUDIT: Expired Orders → Customer Mapping"
	@echo ""
	@echo "Source of truth:"
	@echo "  docs/reports/cross-repo-contract-decisions.md"
	@echo ""
	@echo "Gemini must inspect:"
	@echo " - Order schema (expired status handling)"
	@echo " - Customer schema and identity fields"
	@echo " - Order creation logic (Stripe webhook / save-order)"
	@echo " - Customer lookup / creation logic"
	@echo " - Desk Structure queries for Orders and Customers"
	@echo ""
	@echo "❗ Gemini MUST NOT modify files."
	@echo ""
	@echo "Run Gemini with the prompt below."
	@echo "Save output to:"
	@echo "  docs/reports/expired-orders-customer-audit.md"
	@echo ""
	@read -p "Press ENTER once Gemini report is saved..."
	@echo ""
	@echo "✔ Gemini expired-orders audit recorded."

# =========================================================
# Fast Path — Trivial / Non-Contract Changes
# Skips full AI pipeline but enforces safety checks
# =========================================================

.PHONY: fast-path

fast-path:
	@echo "⚡ FAST PATH MODE (Trivial Changes Only)"
	@echo ""
	@echo "Allowed changes:"
	@echo " - UI copy / labels"
	@echo " - Styling / layout"
	@echo " - Comments / docs"
	@echo " - Tests"
	@echo ""
	@echo "NOT allowed:"
	@echo " - Schema changes"
	@echo " - Data model changes"
	@echo " - Integration logic"
	@echo " - Auth / identity logic"
	@echo ""
	@read -p "Confirm this change is TRIVIAL and does not affect contracts (y/N): " CONFIRM; \
	if [ "$$CONFIRM" != "y" ]; then \
		echo "❌ Fast path aborted."; \
		exit 1; \
	fi

	@echo ""
	@echo "▶ Running lint + runtime typecheck..."
	@pnpm lint
	@pnpm exec tsc -p tsconfig.runtime.json

	@echo ""
	@echo "✔ Fast path complete."
	@echo "If this was not truly trivial, you MUST rerun make ai-pipeline."

.PHONY: new-ai-cycle

new-ai-cycle:
	@if [ -z "$(ISSUE)" ]; then \
		echo "❌ ISSUE not specified. Usage: make new-ai-cycle ISSUE=example-issue"; \
		exit 1; \
	fi
	@echo "🧠 Initializing AI governance cycle for: $(ISSUE)"
	@mkdir -p docs/prompts docs/reports
	@cp docs/ai-governance/templates/gemini-audit.template.txt docs/prompts/gemini-$(ISSUE)-audit.txt
	@sed -i '' "s/<issue>/$(ISSUE)/g" docs/prompts/gemini-$(ISSUE)-audit.txt
	@echo "✔ Gemini audit prompt created:"
	@echo "  docs/prompts/gemini-$(ISSUE)-audit.txt"
	@echo ""
	@echo "Next steps:"
	@echo "1. Run: make gemini-$(ISSUE)-audit"
	@echo "2. Run Gemini with the generated prompt"
	@echo "3. Save report to docs/reports/$(ISSUE)-audit.md"

# =========================================================
# Codex Enforcement — Expired Orders Customer Fix
# =========================================================

.PHONY: codex-expired-orders-enforce

codex-expired-orders-enforce:
	@echo "🤖 CODEX ENFORCEMENT: Expired Orders → Customer Linking"
	@echo ""
	@echo "CONTRACT SOURCE OF TRUTH:"
	@echo "  docs/reports/expired-orders-customer-contract-decisions.md"
	@echo ""
	@echo "IMPLEMENTATION SEQUENCE:"
	@echo ""
	@echo "Phase 1: Schema Change (fas-sanity)"
	@echo "  File: packages/sanity-config/src/schemaTypes/documents/abandonedCheckout.ts"
	@echo "  Action: Add customerRef field (reference to customer, weak, read-only)"
	@echo "  Location: After customerEmail field (line 43)"
	@echo ""
	@echo "Phase 2: Logic Change (fas-cms-fresh)"
	@echo "  File: netlify/functions/reprocessStripeSession.ts"
	@echo "  Action: Add customer lookup in expired checkout branch"
	@echo "  Pattern: Copy EXACT logic from non-expired order flow (lines 12-22 per audit)"
	@echo "  Location: BEFORE upsertAbandonedCheckoutDocument call"
	@echo ""
	@echo "CRITICAL CONSTRAINTS:"
	@echo "  ❌ DO NOT modify non-expired order creation logic"
	@echo "  ❌ DO NOT create customers from abandoned checkouts"
	@echo "  ❌ DO NOT make customerRef required (must be optional)"
	@echo "  ❌ DO NOT change existing abandonedCheckout fields"
	@echo ""
	@echo "VALIDATION CHECKLIST:"
	@echo "  □ Schema deployed to Sanity dataset"
	@echo "  □ customerRef field visible in Studio"
	@echo "  □ Logic mirrors existing order pattern exactly"
	@echo "  □ Non-expired orders unchanged (regression test)"
	@echo "  □ Weak reference allows customer deletion"
	@echo ""
	@read -p "Press ENTER to auto-run Codex enforcement..."
	@echo ""
	@echo "▶ Launching Codex (CLI) for enforcement."
	@echo "▶ Contract: docs/reports/expired-orders-customer-contract-decisions.md"
	@echo ""

	@echo "▶ Writing Codex prompt to .codex_prompt.tmp"
	@printf "%s\n" \
	"Apply ONLY the approved changes in:" \
	"docs/reports/expired-orders-customer-contract-decisions.md" \
	"" \
	"Rules:" \
	"- Do NOT modify any files not explicitly approved." \
	"- Do NOT refactor unrelated code." \
	"- If no changes are required, state so explicitly." \
	> .codex_prompt.tmp

	@echo "▶ Running Codex in non-interactive mode"
	@codex "$$(cat .codex_prompt.tmp)" || true

	@rm -f .codex_prompt.tmp

	@echo ""
	@echo "✔ Codex enforcement finished."
	@echo "Next: make verify-enforcement"
# =========================================================
# Post-Enforcement Verification — Gemini
# =========================================================

.PHONY: verify-enforcement

verify-enforcement:
	@echo "🔍 POST-ENFORCEMENT VERIFICATION"
	@echo ""
	@echo "Run Gemini using the Post-Enforcement Verification prompt."
	@echo "Source of truth:"
	@echo "  docs/reports/cross-repo-contract-decisions.md"
	@echo ""
	@echo "Verification must confirm:"
	@echo " - Codex changes map 1:1 to approved decisions"
	@echo " - No unapproved schema or logic changes"
	@echo " - No UX or data drift introduced"
	@echo ""
	@read -p "Press ENTER once Gemini returns PASS..."
	@echo ""
	@echo "✔ Post-enforcement verification recorded."

.PHONY: gemini-expired-orders-audit

gemini-expired-orders-audit:
	@echo "🔍 GEMINI AUDIT: Expired Orders → Customer Mapping"
	@echo ""
	@echo "Source of truth:"
	@echo "  docs/reports/cross-repo-contract-decisions.md"
	@echo ""
	@echo "Gemini must inspect:"
	@echo " - Order schema (expired status handling)"
	@echo " - Customer schema and identity fields"
	@echo " - Order creation logic (Stripe webhook / save-order)"
	@echo " - Customer lookup / creation logic"
	@echo " - Desk Structure queries for Orders and Customers"
	@echo ""
	@echo "❗ Gemini MUST NOT modify files."
	@echo ""
	@echo "Run Gemini with the prompt below."
	@echo "Save output to:"
	@echo "  docs/reports/expired-orders-customer-audit.md"
	@echo ""
	@read -p "Press ENTER once Gemini report is saved..."
	@echo ""
	@echo "✔ Gemini expired-orders audit recorded."

# =========================================================
# Fast Path — Trivial / Non-Contract Changes
# Skips full AI pipeline but enforces safety checks
# =========================================================

.PHONY: fast-path

fast-path:
	@echo "⚡ FAST PATH MODE (Trivial Changes Only)"
	@echo ""
	@echo "Allowed changes:"
	@echo " - UI copy / labels"
	@echo " - Styling / layout"
	@echo " - Comments / docs"
	@echo " - Tests"
	@echo ""
	@echo "NOT allowed:"
	@echo " - Schema changes"
	@echo " - Data model changes"
	@echo " - Integration logic"
	@echo " - Auth / identity logic"
	@echo ""
	@read -p "Confirm this change is TRIVIAL and does not affect contracts (y/N): " CONFIRM; \
	if [ "$$CONFIRM" != "y" ]; then \
		echo "❌ Fast path aborted."; \
		exit 1; \
	fi

	@echo ""
	@echo "▶ Running lint + runtime typecheck..."
	@pnpm lint
	@pnpm exec tsc -p tsconfig.runtime.json

	@echo ""
	@echo "✔ Fast path complete."
	@echo "If this was not truly trivial, you MUST rerun make ai-pipeline."

.PHONY: new-ai-cycle

new-ai-cycle:
	@if [ -z "$(ISSUE)" ]; then \
		echo "❌ ISSUE not specified. Usage: make new-ai-cycle ISSUE=example-issue"; \
		exit 1; \
	fi
	@echo "🧠 Initializing AI governance cycle for: $(ISSUE)"
	@mkdir -p docs/prompts docs/reports
	@cp docs/ai-governance/templates/gemini-audit.template.txt docs/prompts/gemini-$(ISSUE)-audit.txt
	@sed -i '' "s/<issue>/$(ISSUE)/g" docs/prompts/gemini-$(ISSUE)-audit.txt
	@echo "✔ Gemini audit prompt created:"
	@echo "  docs/prompts/gemini-$(ISSUE)-audit.txt"
	@echo ""
	@echo "Next steps:"
	@echo "1. Run: make gemini-$(ISSUE)-audit"
	@echo "2. Run Gemini with the generated prompt"
	@echo "3. Save report to docs/reports/$(ISSUE)-audit.md"

# =========================================================
# Codex Enforcement — Expired Orders Customer Fix
# =========================================================

.PHONY: codex-expired-orders-enforce

codex-expired-orders-enforce:
	@echo "🤖 CODEX ENFORCEMENT: Expired Orders → Customer Linking"
	@echo ""
	@echo "CONTRACT SOURCE OF TRUTH:"
	@echo "  docs/reports/expired-orders-customer-contract-decisions.md"
	@echo ""
	@echo "IMPLEMENTATION SEQUENCE:"
	@echo ""
	@echo "Phase 1: Schema Change (fas-sanity)"
	@echo "  File: packages/sanity-config/src/schemaTypes/documents/abandonedCheckout.ts"
	@echo "  Action: Add customerRef field (reference to customer, weak, read-only)"
	@echo "  Location: After customerEmail field (line 43)"
	@echo ""
	@echo "Phase 2: Logic Change (fas-cms-fresh)"
	@echo "  File: netlify/functions/reprocessStripeSession.ts"
	@echo "  Action: Add customer lookup in expired checkout branch"
	@echo "  Pattern: Copy EXACT logic from non-expired order flow (lines 12-22 per audit)"
	@echo "  Location: BEFORE upsertAbandonedCheckoutDocument call"
	@echo ""
	@echo "CRITICAL CONSTRAINTS:"
	@echo "  ❌ DO NOT modify non-expired order creation logic"
	@echo "  ❌ DO NOT create customers from abandoned checkouts"
	@echo "  ❌ DO NOT make customerRef required (must be optional)"
	@echo "  ❌ DO NOT change existing abandonedCheckout fields"
	@echo ""
	@echo "VALIDATION CHECKLIST:"
	@echo "  □ Schema deployed to Sanity dataset"
	@echo "  □ customerRef field visible in Studio"
	@echo "  □ Logic mirrors existing order pattern exactly"
	@echo "  □ Non-expired orders unchanged (regression test)"
	@echo "  □ Weak reference allows customer deletion"
	@echo ""
	@read -p "Press ENTER to auto-run Codex enforcement..."
	@echo ""
	@echo "▶ Launching Codex (CLI) for enforcement."
	@echo "▶ Contract: docs/reports/expired-orders-customer-contract-decisions.md"
	@echo ""

	@echo "▶ Writing Codex prompt to .codex_prompt.tmp"
	@printf "%s\n" \
	"Apply ONLY the approved changes in:" \
	"docs/reports/expired-orders-customer-contract-decisions.md" \
	"" \
	"Rules:" \
	"- Do NOT modify any files not explicitly approved." \
	"- Do NOT refactor unrelated code." \
	"- If no changes are required, state so explicitly." \
	> .codex_prompt.tmp

	@echo "▶ Running Codex in non-interactive mode"
	@codex "$$(cat .codex_prompt.tmp)" || true

	@rm -f .codex_prompt.tmp

	@echo ""
	@echo "✔ Codex enforcement finished."
	@echo "Next: make verify-enforcement"
# =========================================================
# Post-Enforcement Verification — Gemini
# =========================================================

.PHONY: verify-enforcement

verify-enforcement:
	@echo "🔍 POST-ENFORCEMENT VERIFICATION"
	@echo ""
	@echo "Run Gemini using the Post-Enforcement Verification prompt."
	@echo "Source of truth:"
	@echo "  docs/reports/cross-repo-contract-decisions.md"
	@echo ""
	@echo "Verification must confirm:"
	@echo " - Codex changes map 1:1 to approved decisions"
	@echo " - No unapproved schema or logic changes"
	@echo " - No UX or data drift introduced"
	@echo ""
	@read -p "Press ENTER once Gemini returns PASS..."
	@echo ""
	@echo "✔ Post-enforcement verification recorded."

.PHONY: gemini-expired-orders-audit

gemini-expired-orders-audit:
	@echo "🔍 GEMINI AUDIT: Expired Orders → Customer Mapping"
	@echo ""
	@echo "Source of truth:"
	@echo "  docs/reports/cross-repo-contract-decisions.md"
	@echo ""
	@echo "Gemini must inspect:"
	@echo " - Order schema (expired status handling)"
	@echo " - Customer schema and identity fields"
	@echo " - Order creation logic (Stripe webhook / save-order)"
	@echo " - Customer lookup / creation logic"
	@echo " - Desk Structure queries for Orders and Customers"
	@echo ""
	@echo "❗ Gemini MUST NOT modify files."
	@echo ""
	@echo "Run Gemini with the prompt below."
	@echo "Save output to:"
	@echo "  docs/reports/expired-orders-customer-audit.md"
	@echo ""
	@read -p "Press ENTER once Gemini report is saved..."
	@echo ""
	@echo "✔ Gemini expired-orders audit recorded."

# =========================================================
# Fast Path — Trivial / Non-Contract Changes
# Skips full AI pipeline but enforces safety checks
# =========================================================

.PHONY: fast-path

fast-path:
	@echo "⚡ FAST PATH MODE (Trivial Changes Only)"
	@echo ""
	@echo "Allowed changes:"
	@echo " - UI copy / labels"
	@echo " - Styling / layout"
	@echo " - Comments / docs"
	@echo " - Tests"
	@echo ""
	@echo "NOT allowed:"
	@echo " - Schema changes"
	@echo " - Data model changes"
	@echo " - Integration logic"
	@echo " - Auth / identity logic"
	@echo ""
	@read -p "Confirm this change is TRIVIAL and does not affect contracts (y/N): " CONFIRM; \
	if [ "$$CONFIRM" != "y" ]; then \
		echo "❌ Fast path aborted."; \
		exit 1; \
	fi

	@echo ""
	@echo "▶ Running lint + runtime typecheck..."
	@pnpm lint
	@pnpm exec tsc -p tsconfig.runtime.json

	@echo ""
	@echo "✔ Fast path complete."
	@echo "If this was not truly trivial, you MUST rerun make ai-pipeline."

.PHONY: new-ai-cycle

new-ai-cycle:
	@if [ -z "$(ISSUE)" ]; then \
		echo "❌ ISSUE not specified. Usage: make new-ai-cycle ISSUE=example-issue"; \
		exit 1; \
	fi
	@echo "🧠 Initializing AI governance cycle for: $(ISSUE)"
	@mkdir -p docs/prompts docs/reports
	@cp docs/ai-governance/templates/gemini-audit.template.txt docs/prompts/gemini-$(ISSUE)-audit.txt
	@sed -i '' "s/<issue>/$(ISSUE)/g" docs/prompts/gemini-$(ISSUE)-audit.txt
	@echo "✔ Gemini audit prompt created:"
	@echo "  docs/prompts/gemini-$(ISSUE)-audit.txt"
	@echo ""
	@echo "Next steps:"
	@echo "1. Run: make gemini-$(ISSUE)-audit"
	@echo "2. Run Gemini with the generated prompt"
	@echo "3. Save report to docs/reports/$(ISSUE)-audit.md"

# =========================================================
# Codex Enforcement — Expired Orders Customer Fix
# =========================================================

.PHONY: codex-expired-orders-enforce

codex-expired-orders-enforce:
	@echo "🤖 CODEX ENFORCEMENT: Expired Orders → Customer Linking"
	@echo ""
	@echo "CONTRACT SOURCE OF TRUTH:"
	@echo "  docs/reports/expired-orders-customer-contract-decisions.md"
	@echo ""
	@echo "IMPLEMENTATION SEQUENCE:"
	@echo ""
	@echo "Phase 1: Schema Change (fas-sanity)"
	@echo "  File: packages/sanity-config/src/schemaTypes/documents/abandonedCheckout.ts"
	@echo "  Action: Add customerRef field (reference to customer, weak, read-only)"
	@echo "  Location: After customerEmail field (line 43)"
	@echo ""
	@echo "Phase 2: Logic Change (fas-cms-fresh)"
	@echo "  File: netlify/functions/reprocessStripeSession.ts"
	@echo "  Action: Add customer lookup in expired checkout branch"
	@echo "  Pattern: Copy EXACT logic from non-expired order flow (lines 12-22 per audit)"
	@echo "  Location: BEFORE upsertAbandonedCheckoutDocument call"
	@echo ""
	@echo "CRITICAL CONSTRAINTS:"
	@echo "  ❌ DO NOT modify non-expired order creation logic"
	@echo "  ❌ DO NOT create customers from abandoned checkouts"
	@echo "  ❌ DO NOT make customerRef required (must be optional)"
	@echo "  ❌ DO NOT change existing abandonedCheckout fields"
	@echo ""
	@echo "VALIDATION CHECKLIST:"
	@echo "  □ Schema deployed to Sanity dataset"
	@echo "  □ customerRef field visible in Studio"
	@echo "  □ Logic mirrors existing order pattern exactly"
	@echo "  □ Non-expired orders unchanged (regression test)"
	@echo "  □ Weak reference allows customer deletion"
	@echo ""
	@read -p "Press ENTER to auto-run Codex enforcement..."
	@echo ""
	@echo "▶ Launching Codex (CLI) for enforcement."
	@echo "▶ Contract: docs/reports/expired-orders-customer-contract-decisions.md"
	@echo ""

	@echo "▶ Writing Codex prompt to .codex_prompt.tmp"
	@printf "%s\n" \
	"Apply ONLY the approved changes in:" \
	"docs/reports/expired-orders-customer-contract-decisions.md" \
	"" \
	"Rules:" \
	"- Do NOT modify any files not explicitly approved." \
	"- Do NOT refactor unrelated code." \
	"- If no changes are required, state so explicitly." \
	> .codex_prompt.tmp

	@echo "▶ Running Codex in non-interactive mode"
	@codex "$$(cat .codex_prompt.tmp)" || true

	@rm -f .codex_prompt.tmp

	@echo ""
	@echo "✔ Codex enforcement finished."
	@echo "Next: make verify-enforcement"
