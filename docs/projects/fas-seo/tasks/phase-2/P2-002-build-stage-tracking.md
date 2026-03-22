---
id: P2-002
title: Implement build-stage tracking from order history
phase: 2
status: todo
priority: high
assignee: ""
depends_on: ["P2-001"]
definition_of_done: |
  Build stage auto-calculated from Medusa order history.
  "Ready for next upgrade" signals surfaced in dashboards.
verification_steps:
  - Customer with 3+ orders has auto-calculated build stage
  - Build stage updates when new order is placed
  - Dashboard shows customers grouped by build stage
created: 2026-03-22
updated: 2026-03-22
---

## Description

Define build stages based on product purchase history and auto-calculate from Medusa order data.

Build stages:
- **Stock** — No performance parts purchased
- **Bolt-on** — Basic bolt-on parts (pulleys, intakes, exhaust)
- **Built** — Internal engine parts, turbo kits, or FAS packages
- **Race** — Race-spec parts, roll cages, or competition packages

Surface "ready for next upgrade" signals when a customer's purchase pattern suggests they're approaching the next stage.
