---
id: P3-001
title: Build retention cohort analysis dashboards
phase: 3
status: todo
priority: high
assignee: ""
depends_on: ["P2-003"]
definition_of_done: |
  Monthly acquisition cohort dashboard operational.
  Shows repeat purchase rate, time-to-second-order, cohort revenue.
verification_steps:
  - Cohorts show at least 6 monthly groups
  - Repeat purchase rate calculated correctly
  - Visualization renders in dashboard (chart.tsx or equivalent)
created: 2026-03-22
updated: 2026-03-22
---

## Description

Build monthly acquisition cohort analysis from Medusa order data.

Track per cohort:
- Repeat purchase rate
- Time-to-second-order
- Revenue per cohort over time
- Cohort size

Visualize using existing chart infrastructure (`src/components/ui/chart.tsx`).
