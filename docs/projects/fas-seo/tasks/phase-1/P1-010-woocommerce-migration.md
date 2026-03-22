---
id: P1-010
title: Migrate or retire legacy WooCommerce store
phase: 1
status: todo
priority: medium
assignee: ""
depends_on: []
definition_of_done: |
  All active WooCommerce URLs are redirected to fas-cms equivalents.
  WooCommerce store is decommissioned.
  No customer-facing links point to WooCommerce.
verification_steps:
  - Old WooCommerce URLs return 301 redirects to new store
  - No active traffic to WooCommerce (verify in analytics)
  - WooCommerce hosting can be shut down
created: 2026-03-22
updated: 2026-03-22
---

## Description

Audit and retire the legacy WooCommerce store.

### NEEDS CONFIRMATION
- Current state of WooCommerce store (is it still live?)
- Which URLs are still receiving traffic
- Whether any integrations depend on WooCommerce
- Historical data migration requirements
