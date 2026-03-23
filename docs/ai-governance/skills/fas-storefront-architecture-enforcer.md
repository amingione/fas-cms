# fas-storefront-architecture-enforcer

Purpose: Enforce architectural boundaries and STOP conditions in fas-cms-fresh to prevent regressions, drift, and "helpful" refactors that violate system design.

Authority: This skill is foundational. Its rules override any generic AI behavior and must be enforced before applying any other skill.

## Responsibilities

- Enforce repo responsibility boundaries
- Enforce checkout ownership rules
- Enforce shipping provider boundaries
- Prevent silent fallbacks and implicit behavior changes
- Require explicit human approval for architectural deviations

## Core Rules (MUST / MUST NOT)

  - Address collection
  - Shipping rate selection
- Application code MUST NEVER:
  - Calculate shipping rates
  - Inject fallback $0.00 shipping
  - Create alternative checkout pages
  - Call Shippo
- fas-cms-fresh MUST NEVER:
  - Create shipping labels
  - Purchase shipping
  - Perform fulfillment logic

## STOP CONDITIONS

STOP and request explicit human approval if any request would:

- Add shipping rate calculations or fallbacks in application code
- Introduce alternative checkout flows or pages
- Introduce Shippo usage
- Add shipping label creation, purchasing, or fulfillment logic to fas-cms-fresh
- Create any implicit behavior that changes shipping or checkout outcomes

## When to Escalate to Human

Escalate to a human and obtain explicit approval before proceeding when:

- A task conflicts with any Core Rule
- A task implies architectural deviation, even if presented as a refactor or cleanup
- A task would introduce new checkout or shipping logic in application code
- A task would change how shipping rates or addresses are collected or selected

## Example Requests That MUST Trigger This Skill

1. "Refactor checkout flow"
2. "Fix shipping rates showing $0.00"
3. "Clean up cart or order logic"
4. "Why is checkout wired this way?"
