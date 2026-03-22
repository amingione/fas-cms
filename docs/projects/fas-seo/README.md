# F.A.S. Motorsports — AI Integrations Roadmap

## Project Objective

Close the analytics and personalization gap in FAS's headless commerce stack. The architecture (Astro + Sanity + Medusa + Stripe) is capable but lacks the deliberate, custom analytics work that monolithic platforms provide by default.

**Core goal:** Gain full visibility into the customer journey — from a $220 pulley to a $17,999 build package — so FAS can identify, nurture, and convert high-value customers.

## Scope

This project covers three phases over 365 days:

1. **Instrument and Measure** (0–90 days) — GA4 enhanced ecommerce, KPI dashboards, data dictionary
2. **Know the Customer** (90–180 days) — Vehicle profiles, build-stage tracking, CLV, NPS, dealer dashboards
3. **Optimize and Predict** (180–365 days) — Cohort analysis, affinity scoring, demand forecasting, scheduling, results DB

## Key Assumptions vs Verified Facts

### Verified (from codebase)

| Fact | Source |
|------|--------|
| GA4 is loaded via gtag.js with ID `G-NQ94Z6HWGV` | `src/layouts/BaseLayout.astro` |
| Google Ads tracking active (`AW-17641771829`) | `src/layouts/BaseLayout.astro` |
| No enhanced ecommerce events are currently fired | Grep of codebase — no `view_item`, `add_to_cart`, `begin_checkout`, or `purchase` gtag calls |
| Cart state uses React Context + localStorage, not nanostores | `src/components/cart/cart-context.tsx`, `src/lib/cart.ts` |
| Medusa is authoritative for all commerce data | API routes in `src/pages/api/medusa/` |
| Sanity is content-only (11 schemas: vendor, quoteRequest, customer, etc.) | `sanity/schemas/` |
| Stripe PaymentIntent flow via Medusa BFF | `src/pages/api/medusa/payments/create-intent.ts` |
| Stripe webhook deprecated in fas-cms (410 Gone) — routed to fas-medusa | `src/pages/api/medusa/webhooks/payment-intent.ts` |
| Server-side GA4 API integration exists (read-only, for SEO dashboard) | `src/lib/analytics/googleAnalytics.ts` |
| Ahrefs analytics loaded | `src/layouts/BaseLayout.astro` |
| 102 API routes, 143 Astro pages, ~150 React component files | Codebase audit |

### Assumptions (NEEDS CONFIRMATION)

| Assumption | Why it matters |
|------------|---------------|
| GTM container exists but is not yet configured for enhanced ecommerce | Need to verify GTM container ID and current tag configuration |
| Medusa emits server-side events (e.g., `order.placed`) that can feed Measurement Protocol | Depends on fas-medusa webhook/event setup |
| Stripe built-in analytics (Stripe Dashboard) is accessible but not actively monitored | Requires confirmation of Stripe Dashboard access and alert configuration |
| No existing CLV calculation or customer segmentation | No code found, but could exist in external tools |
| Vehicle/platform data is not currently stored in Sanity or Medusa customer records | Customer schema in Sanity is basic (name, email, phone, notes, address) |

## Success Metrics

| Metric | Phase | Target |
|--------|-------|--------|
| GA4 enhanced ecommerce event coverage | 1 | 100% of view_item, add_to_cart, begin_checkout, purchase events firing |
| KPI dashboard operational | 1 | Revenue, AOV, conversion rate, traffic sources, top products visible |
| Data dictionary completeness | 1 | All Sanity schemas, Medusa entities, API contracts documented |
| Customer profiles with vehicle data | 2 | NEEDS CONFIRMATION — target TBD after vehicle schema design |
| CLV calculation running | 2 | Automated CLV scores for all customers with 2+ orders |
| NPS response rate | 2 | >15% response rate on post-purchase surveys |
| Retention cohort dashboards | 3 | Monthly cohort analysis with 12+ months of data |
| Demand forecast accuracy | 3 | NEEDS CONFIRMATION — baseline accuracy target TBD |

## Milestones

### Phase 1: Instrument and Measure (Days 0–90)
- GA4 enhanced ecommerce tracking live
- GTM configured for all ecommerce events
- Medusa server-side events piped to GA4 via Measurement Protocol
- KPI dashboards operational
- Stripe analytics enabled
- Data dictionary published
- Legacy WooCommerce store migrated or retired

### Phase 2: Know the Customer (Days 90–180)
- Customer vehicle profile system in Sanity + Medusa
- Build-stage tracking operational
- CLV calculation running
- Post-purchase NPS surveys deployed
- B2B dealer dashboards with ordering analytics

### Phase 3: Optimize and Predict (Days 180–365)
- Retention cohort analysis dashboards
- Product affinity scoring and recommendation engine
- Seasonal demand forecasting models
- Shop service scheduling with labor utilization tracking
- Verified performance results database (dyno numbers, track times)

## Related Documentation

- [Roadmap Details](./roadmap.md)
- [Architecture](./architecture.md)
- [Data Dictionary](./data-dictionary.md)
- [Analytics Spec](./analytics-spec.md)
- [Task System](./tasks/README.md)
- [Memory / Working Notes](./memory.md)
