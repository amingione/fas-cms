---
id: P1-007
title: Build KPI dashboards (revenue, AOV, conversion, traffic, products)
phase: 1
status: todo
priority: medium
assignee: ""
depends_on: ["P1-002", "P1-003", "P1-005"]
definition_of_done: |
  Dashboard shows 5 core KPIs with last-7-day and last-30-day views.
  Data refreshes automatically.
verification_steps:
  - Revenue metric matches Stripe Dashboard for same period
  - AOV = Revenue / Orders count
  - Conversion rate shows funnel from view_item → purchase
  - Traffic sources show top 5 channels
  - Top products show top 10 by revenue
created: 2026-03-22
updated: 2026-03-22
---

## Description

Build KPI dashboards covering:
1. Revenue (daily/weekly/monthly)
2. Average Order Value (AOV)
3. Conversion rate (by funnel stage)
4. Traffic sources and attribution
5. Top products by revenue and units

### Tool Options
- GA4 Explorations (built-in, no cost)
- Looker Studio connected to GA4 (free, shareable)
- Extend existing `admin/seo-dashboard.astro` with ecommerce metrics

### Notes
- Existing server-side GA4 API integration (`src/lib/analytics/googleAnalytics.ts`) reads sessions/pageviews — could be extended for ecommerce metrics
- Stripe Dashboard provides independent revenue verification
