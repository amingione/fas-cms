# =========================================================
# AI Governance — fas-cms
# =========================================================

include codex-enforce.mk
include governance-guards.mk

.PHONY: new-ai-cycle verify-enforcement fast-path

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
# Post-Enforcement Verification — Gemini
# =========================================================

.PHONY: verify-enforcement

verify-enforcement: governance-guard
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
	@echo "If this was not truly trivial, you MUST rerun the governance flow."

	# =========================================================
# Gemini Audit — Checkout Discounts & Coupons
# =========================================================

.PHONY: gemini-checkout-discounts-audit

gemini-checkout-discounts-audit:
	@mkdir -p docs/prompts docs/reports
	@echo "🔍 GEMINI AUDIT: Checkout Discounts & Coupons"
	@echo ""
	@echo "Scope:"
	@echo " - Checkout UI"
	@echo " - Cart UI"
	@echo " - Stripe Checkout session creation"
	@echo " - Discount / coupon handling"
	@echo ""
	@echo "Output:"
	@echo " - docs/reports/checkout-discounts-audit.md"
	@echo ""
	@echo "Run Gemini using the generated prompt."
	@read -p "Press ENTER once Gemini audit is complete and saved..."

# =========================================================
# Codex Audit — Promotion GROQ Execution Path
# =========================================================

.PHONY: codex-promotion-groq-execution-audit

codex-promotion-groq-execution-audit:
	@mkdir -p docs/prompts
	@echo "🔍 CODEX AUDIT: Promotion GROQ Execution Path"
	@echo "Writing prompt to docs/prompts/codex-promotion-groq-execution-audit.txt"

	@printf "%s\n" \
	"AUDIT TASK — READ ONLY" \
	"" \
	"Repository: fas-cms-fresh" \
	"" \
	"Objective:" \
	"Identify the source of the GROQ parse error thrown when applying a promotion code," \
	"given that promotions.ts already uses valid _ref projections." \
	"" \
	"Scope:" \
	"- DO NOT modify any files" \
	"- DO NOT propose fixes yet" \
	"- ONLY identify the source of the invalid GROQ query" \
	"" \
	"Instructions:" \
	"1. Trace the execution path for POST /api/promotions/apply" \
	"2. Identify every GROQ query executed in this path" \
	"3. Locate any query that:" \
	"   - uses invalid projection syntax" \
	"   - is dynamically constructed" \
	"   - differs from promotions.ts" \
	"4. Determine whether:" \
	"   - an alternate query is used for eligibility checks" \
	"   - a conditional fragment is appended at runtime" \
	"   - cached or duplicated logic exists" \
	"" \
	"Output:" \
	"Write a report to:" \
	"docs/reports/promotion-groq-execution-audit.md" \
	"" \
	"The report must include:" \
	"- File path(s)" \
	"- Exact GROQ string(s)" \
	"- Which query is executed at runtime" \
	"- Why the parse error still occurs" \
	"- Confirmation of whether promotions.ts is actually the query being used" \
	"" \
	"STOP AFTER AUDIT." \
	> docs/prompts/codex-promotion-groq-execution-audit.txt

	@echo ""
	@echo "NEXT STEP:"
	@echo "  codex"
	@echo "  (paste docs/prompts/codex-promotion-groq-execution-audit.txt)"
