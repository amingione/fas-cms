---
id: P1-006
title: Implement purchase event via Measurement Protocol (server-side)
phase: 1
status: todo
priority: high
assignee: ""
depends_on: ["P1-005"]
definition_of_done: |
  Server-side purchase event fires to GA4 via Measurement Protocol
  when Medusa confirms an order.
  Event includes event_id for deduplication with client-side event.
verification_steps:
  - Complete test order → Measurement Protocol validation endpoint returns 200
  - GA4 shows single purchase event (not duplicated with client-side)
  - transaction_id and revenue match Medusa order
  - GA client_id is correctly passed from checkout session
created: 2026-03-22
updated: 2026-03-22
---

## Description

Pipe Medusa server-side order events to GA4 via Measurement Protocol API.

### Prerequisites (NEEDS CONFIRMATION)
- Medusa emits order events (e.g., `order.placed`) — verify in fas-medusa repo
- GA4 Measurement Protocol API secret must be generated in GA4 Admin
- GA `client_id` must be captured from `_ga` cookie during checkout and stored in Medusa order metadata

### Implementation
- Endpoint: `POST https://www.google-analytics.com/mp/collect`
- Query params: `measurement_id=G-NQ94Z6HWGV&api_secret=<secret>`
- Include `event_id` = `transaction_id` for deduplication

See [analytics-spec.md](../../analytics-spec.md) for payload format.
