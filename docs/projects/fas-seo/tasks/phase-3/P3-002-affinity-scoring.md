---
id: P3-002
title: Implement product affinity scoring and recommendations
phase: 3
status: todo
priority: high
assignee: ""
depends_on: ["P3-001"]
definition_of_done: |
  Affinity matrix generated for top 50 products.
  Recommendations surfaced on product pages.
verification_steps:
  - Affinity scores exist for top 50 products
  - Product page shows "customers also bought" recommendations
  - Recommendations are based on actual order data, not invented
created: 2026-03-22
updated: 2026-03-22
---

## Description

Analyze Medusa order baskets to identify co-purchase patterns. Build "customers who bought X also bought Y" affinity matrix.

Requires 6+ months of order data from Phase 1+2 instrumentation.

Surface recommendations on product detail pages via a React component.
