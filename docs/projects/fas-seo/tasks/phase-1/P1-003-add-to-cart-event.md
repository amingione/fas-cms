---
id: P1-003
title: Implement add_to_cart dataLayer event
phase: 1
status: todo
priority: high
assignee: ""
depends_on: ["P1-001"]
definition_of_done: |
  add_to_cart event fires after successful Medusa cart API response.
  Event includes item details and cart_id custom parameter.
verification_steps:
  - Add item to cart → dataLayer contains add_to_cart event
  - Event fires only on success (not on API error)
  - GA4 DebugView shows add_to_cart with correct parameters
  - No duplicate events on rapid clicks
created: 2026-03-22
updated: 2026-03-22
---

## Description

Add `add_to_cart` dataLayer push in the cart action flow. Fire after Medusa API confirms the item was added.

Target files:
- `src/components/cart/add-to-cart.tsx`
- `src/components/cart/actions.ts`

See [analytics-spec.md](../../analytics-spec.md) for exact event payload.

## Notes

- Must fire in the `.then()` / success callback of the Medusa cart add-item API call
- Include `cart_id` as custom parameter for cross-referencing with Medusa
