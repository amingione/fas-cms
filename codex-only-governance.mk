# =========================================================
# CODEX-ONLY GOVERNANCE (NON-INTERACTIVE, QUOTA-SAFE)
# =========================================================

.PHONY: codex-%-audit codex-%-decide codex-%-enforce codex-%-verify

# ---------------------------------------------------------
# Phase 1: Codex Audit (READ-ONLY)
# ---------------------------------------------------------
codex-%-audit:
	@echo "🔍 CODEX AUDIT: $*"
	@echo ""
	@printf "%s\n" \
	"TASK: Perform a READ-ONLY audit for issue '$*'." \
	"" \
	"Rules:" \
	"- Inspect runtime boundaries, assumptions, and risks." \
	"- Do NOT modify any files." \
	"- Do NOT propose fixes yet." \
	"" \
	"OUTPUT FILE:" \
	"docs/reports/$*-audit.md" \
	| codex

# ---------------------------------------------------------
# Phase 2: Codex Decisions (AUTHORITATIVE CONTRACT)
# ---------------------------------------------------------
codex-%-decide:
	@echo "🧠 CODEX DECISIONS: $*"
	@echo ""
	@test -f docs/reports/$*-audit.md || (echo "❌ Missing audit file"; exit 1)
	@printf "%s\n" \
	"TASK: Convert the audit into an AUTHORITATIVE CONTRACT." \
	"" \
	"INPUT:" \
	"docs/reports/$*-audit.md" \
	"" \
	"Rules:" \
	"- This file defines what Codex is allowed to implement." \
	"- Be explicit and conservative." \
	"- Do NOT implement code." \
	"" \
	"OUTPUT FILE:" \
	"docs/reports/$*-contract-decisions.md" \
	| codex

# ---------------------------------------------------------
# Phase 3: Codex Enforcement (IMPLEMENTATION)
# ---------------------------------------------------------
codex-%-enforce:
	@echo "🤖 CODEX ENFORCEMENT: $*"
	@echo ""
	@test -f docs/reports/$*-contract-decisions.md || (echo "❌ Missing contract decisions"; exit 1)
	@printf "%s\n" \
	"Apply ONLY the approved changes in:" \
	"docs/reports/$*-contract-decisions.md" \
	"" \
	"CRITICAL RULES:" \
	"- Do NOT exceed the contract." \
	"- Do NOT modify unapproved files." \
	"- If no changes are required, state so explicitly." \
	| codex

# ---------------------------------------------------------
# Phase 4: Codex Verification (OPTIONAL)
# ---------------------------------------------------------
codex-%-verify:
	@echo "🔍 CODEX VERIFY: $*"
	@printf "%s\n" \
	"TASK: Verify implementation matches the contract." \
	"" \
	"INPUTS:" \
	"docs/reports/$*-contract-decisions.md" \
	"git diff" \
	"" \
	"Rules:" \
	"- Confirm 1:1 mapping." \
	"- Flag any drift." \
	| codex
