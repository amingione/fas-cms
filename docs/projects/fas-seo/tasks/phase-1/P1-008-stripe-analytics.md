---
id: P1-008
title: Enable and configure Stripe built-in analytics
phase: 1
status: todo
priority: medium
assignee: ""
depends_on: []
definition_of_done: |
  Stripe Dashboard analytics are accessible and configured.
  Failed payment alerts are set up.
verification_steps:
  - Stripe Dashboard shows revenue metrics
  - Failed payment email alerts configured
  - Stripe revenue matches GA4 purchase events for same period
created: 2026-03-22
updated: 2026-03-22
---

## Description

Enable Stripe's built-in analytics and reporting features:
- Revenue reporting in Stripe Dashboard
- Failed payment alerts
- Optionally: Stripe Sigma for advanced queries

This is independent of GA4 and provides a second source of truth for revenue data.
