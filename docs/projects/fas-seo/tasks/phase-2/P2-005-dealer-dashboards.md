---
id: P2-005
title: Create B2B dealer dashboards with ordering analytics
phase: 2
status: todo
priority: medium
assignee: ""
depends_on: []
definition_of_done: |
  Dealer-specific views available in vendor portal.
  Shows order volume, top products, reorder frequency.
verification_steps:
  - Vendor login shows analytics dashboard
  - Order volume data matches Medusa records
  - Top products list is accurate
  - Multiple vendors see only their own data
created: 2026-03-22
updated: 2026-03-22
---

## Description

Build dealer-specific analytics views in the existing vendor portal.

Existing vendor infrastructure:
- Vendor auth: `src/pages/api/vendor/` (auth, login, etc.)
- Vendor analytics route: `src/pages/api/vendor/analytics.ts`
- Vendor dashboard route: `src/pages/api/vendor/dashboard.ts`

Dashboard metrics:
- Order volume (daily/weekly/monthly)
- Top products by revenue and units
- Reorder frequency
- Average order value per dealer
