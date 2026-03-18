# F.A.S. Motorsports Brand Voice + Content Optimization Plan

## Summary
This plan standardizes customer-facing copy across `fas-cms-fresh` so every page is technically credible, useful, and aligned with F.A.S. Motorsports positioning: luxury performance, vehicle-specific engineering, in-house fabrication, and durable real-world builds. Scope is UI/content only. No API, business logic, pricing logic, or checkout logic changes.

## Audit Findings (Content Risk Categories)
1. Placeholder or developer language
- “Coming soon”/empty-state messaging appears in customer product detail areas.
- Placeholder avatars/testimonial presentation patterns reduce trust.
- Generic fallback text appears where product specifics should be shown.

2. Unverifiable claims
- Superlatives and absolute claims (for example “#1”, “unbreakable”, “unstoppable”) are used without nearby proof or context.
- Broad performance promises are sometimes stated without qualification.

3. Generic copy and weak differentiation
- Repetitive high-level language (“state-of-the-art”, “unmatched”) appears without concrete technical details.
- Some sections read like template marketing copy rather than F.A.S.-specific expertise.

4. Weak product detail depth
- Product/service sections sometimes omit fitment, build constraints, validation process, or expected outcomes.
- Customers are not always guided to next step when data is incomplete.

5. Canonical consistency issues
- Repeated business/contact facts are not always centralized in copy patterns.
- Inconsistent phrasing around services/process can create ambiguity in brand promise.

## Brand Voice Definition (F.A.S. Motorsports)
### Positioning
- Luxury-performance engineering shop for serious enthusiasts and owners who want durable, custom-fit outcomes.
- Every build is tailored to the customer’s exact vehicle, usage profile, and goals.
- In-house fabrication and validation are central proof points.

### Voice pillars
1. Precision over hype
- Write like a trusted technical advisor.
- Prefer measurable details, constraints, and process transparency.

2. Premium without exaggeration
- Confident tone, but no unsupported absolutes.
- Premium language should reflect workmanship, process, and outcomes.

3. Customer-specific craftsmanship
- Emphasize per-vehicle calibration, fitment checks, fabrication options, and iterative refinement.

4. Durable performance truth
- Frame gains with context: reliability, thermal management, drivability, duty cycle, and long-term ownership.

### Core message architecture
- What we do: custom performance systems and packages built for the individual vehicle.
- How we do it: consultation -> inspection -> design/spec -> fabrication/tuning -> validation -> delivery/support.
- Why it matters: confidence, repeatable performance, and build integrity.

## Rewrite Standards (Do / Don’t)
### Do
- Use concrete nouns and process verbs: inspect, spec, fabricate, validate, calibrate.
- State fitment and compatibility expectations clearly.
- Include decision-useful details: intended use, constraints, options, lead-time ranges, next step.
- Replace empty states with transparent guidance and a CTA (consultation, fitment verification, support contact).

### Don’t
- Don’t use filler phrases with no technical substance.
- Don’t use unverifiable superlatives without proof.
- Don’t imply universal fitment, guaranteed gains, or one-size-fits-all outcomes.
- Don’t leave customer-facing placeholders or “TBD/coming soon” dead ends.

## Proof Policy (Claims Governance)
1. Claims allowed without citation
- Process statements about how F.A.S. works (consultation, in-house fabrication, vehicle-specific approach).
- Non-quantified quality positioning that is not absolute.

2. Claims requiring proof source
- Ranked claims (#1, best, most trusted), absolute security/performance claims, quantified outcome claims.
- Any statement that can be interpreted as comparative or guaranteed.

3. If proof is unavailable
- Rewrite to process-based, verifiable language.
- Remove claim entirely if it cannot be responsibly reframed.

## Content Governance Checklist
Apply this checklist before publishing or merging copy updates:
1. Is every claim either verifiable or rewritten as a process fact?
2. Does the page explain who the offering is for and what problem it solves?
3. Are fitment, prerequisites, and limitations clearly stated?
4. Is the next step explicit (book consult, request fitment review, contact support)?
5. Is there zero placeholder/dev language in customer-visible text?
6. Is tone consistent with luxury + technical credibility?
7. Are core business facts and terminology consistent with canonical sources?

## Phased Roadmap (Customer Pages First)
### Phase 1: Revenue-critical pages (immediate)
- Homepage hero/value sections
- Services overview + service detail pages
- Product/shop detail templates and product information tabs
- Package landing pages and core build pages

Deliverable:
- Remove placeholder language.
- Replace generic copy with technical, customer-useful content.
- Normalize claim language to proof policy.

### Phase 2: Trust and education layer
- About/company narrative
- FAQ, contact, and process explanation pages
- Supporting educational sections that can internally cross-link (“rabbit hole” navigation)

Deliverable:
- Add journey-oriented internal linking to related services, builds, and consult paths.
- Improve transparency around process, customization, and expected outcomes.

### Phase 3: System hardening
- Create reusable copy blocks/patterns for claims, fitment notes, and empty-state handling.
- Add editorial QA gate to PR checklist for customer-facing copy.

Deliverable:
- Sustainable governance so placeholder/generic language does not regress.

## Acceptance Criteria (Measurable)
1. Placeholder elimination
- 0 customer-facing occurrences of “coming soon”, “TBD”, placeholder testimonial artifacts, or developer-only wording.

2. Claims compliance
- 100% of comparative/absolute/quantified claims either have supporting source context or are rewritten.

3. Customer utility uplift
- 100% of key service/product pages include:
  - intended customer/use case
  - fitment or compatibility guidance
  - clear next-step CTA

4. Voice consistency
- 100% sampled key pages pass brand-voice checklist (precision, premium, custom-specific, transparent).

5. Consistency
- Canonical company facts and terminology are standardized across audited pages.

## QA Checklist (Execution)
1. Manual page pass on desktop and mobile for all customer-facing templates.
2. Verify no content regressions in shared components used across routes.
3. Validate internal links added for discovery paths are functional and relevant.
4. Run search scan for banned terms/placeholders before merge.
5. Final editorial review by owner/stakeholder for tone approval.

## Implementation Notes
- This plan is intentionally UI/content-only and architecture-safe.
- Commerce logic remains in Medusa/Stripe/Shippo flow as currently implemented.
