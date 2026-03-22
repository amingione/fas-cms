---
id: P1-005
title: Implement purchase dataLayer event (client-side)
phase: 1
status: todo
priority: high
assignee: ""
depends_on: ["P1-001"]
definition_of_done: |
  purchase event fires on order confirmation page with full order details.
  Includes transaction_id for deduplication with server-side event.
  No duplicate fires on page refresh.
verification_steps:
  - Complete a test order → confirmation page fires purchase event
  - transaction_id matches Medusa order ID
  - Revenue, tax, shipping values are correct
  - Refreshing confirmation page does not fire duplicate purchase
  - GA4 DebugView shows purchase with correct revenue
created: 2026-03-22
updated: 2026-03-22
---

## Description

Add `purchase` dataLayer push on the order confirmation page.

Target file: `src/pages/order/confirmation.astro`

Include `event_id` = `transaction_id` for deduplication with server-side Measurement Protocol event.

Use localStorage flag to prevent duplicate fires on page refresh.

See [analytics-spec.md](../../analytics-spec.md) for exact event payload and dedup strategy.
