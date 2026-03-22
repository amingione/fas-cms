---
id: P1-002
title: Implement view_item dataLayer event
phase: 1
status: todo
priority: high
assignee: ""
depends_on: ["P1-001"]
definition_of_done: |
  view_item event fires on all product detail pages and quick-view modals.
  Event includes required GA4 parameters and custom platform dimension.
  Event appears in GA4 DebugView with correct data.
verification_steps:
  - Navigate to product page → dataLayer contains view_item event
  - Open quick-view modal → dataLayer contains view_item event
  - GA4 DebugView shows view_item with correct item_id, item_name, price
  - Custom platform parameter populated when applicable
created: 2026-03-22
updated: 2026-03-22
---

## Description

Add `view_item` dataLayer pushes to product detail pages and the quick-view modal component.

Target files:
- Product pages in `src/pages/` (builds, packages, specs, wheels)
- `src/components/storefront/ProductQuickViewButton.tsx`

See [analytics-spec.md](../../analytics-spec.md) for exact event payload.

## Notes

- Lowest risk event to implement first — read-only, no cart interaction
- Product data comes from Medusa; ensure variant_id is used as item_id
