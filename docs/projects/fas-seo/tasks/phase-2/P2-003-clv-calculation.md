---
id: P2-003
title: Launch CLV calculation from Medusa order history
phase: 2
status: todo
priority: high
assignee: ""
depends_on: ["P2-001"]
definition_of_done: |
  CLV scores calculated for all customers with 2+ orders.
  CLV updates automatically on new order.
  Scores accessible in customer dashboard or Sanity.
verification_steps:
  - CLV score exists for all customers with 2+ orders
  - CLV formula accounts for total spend, frequency, AOV, tenure
  - New order triggers CLV recalculation
  - Top 20 customers by CLV can be listed
created: 2026-03-22
updated: 2026-03-22
---

## Description

Calculate Customer Lifetime Value using Medusa order history.

CLV formula inputs:
- Total spend (all-time)
- Order frequency (orders per month)
- Average order value
- Customer tenure (first order to today)

Store CLV score in Sanity customer record or a dedicated analytics store.
Update on each new order completion.
