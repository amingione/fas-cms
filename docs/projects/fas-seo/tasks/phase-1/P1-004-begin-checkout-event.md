---
id: P1-004
title: Implement begin_checkout dataLayer event
phase: 1
status: todo
priority: high
assignee: ""
depends_on: ["P1-001"]
definition_of_done: |
  begin_checkout event fires once when CheckoutForm.tsx mounts with a valid cart.
  No duplicate fires on re-render.
verification_steps:
  - Navigate to checkout with items → dataLayer contains begin_checkout
  - Refresh checkout page → only one begin_checkout fires
  - Event includes all cart items with correct prices
  - GA4 DebugView shows begin_checkout
created: 2026-03-22
updated: 2026-03-22
---

## Description

Add `begin_checkout` dataLayer push in the checkout page. Fire once when `CheckoutForm.tsx` mounts with a valid cart.

Target files:
- `src/pages/checkout.astro`
- `src/components/checkout/CheckoutForm.tsx`

Use a `useEffect` with a ref guard to prevent duplicate fires on re-render.

See [analytics-spec.md](../../analytics-spec.md) for exact event payload.
