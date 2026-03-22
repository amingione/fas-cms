---
id: P2-001
title: Design and deploy customer vehicle profile schema
phase: 2
status: todo
priority: high
assignee: ""
depends_on: []
definition_of_done: |
  Sanity customer schema extended with vehicle profile fields.
  Medusa customer metadata mirrors vehicle data.
  Admin UI can view/edit vehicle profiles.
verification_steps:
  - Sanity Studio shows vehicle fields on customer records
  - API can read/write vehicle profile data
  - Existing customer records not broken by schema change
created: 2026-03-22
updated: 2026-03-22
---

## Description

Extend the Sanity `customer` schema (`sanity/schemas/customer.ts`) with vehicle profile fields:

- `platform` (string) — Vehicle platform (e.g., S550 Mustang, Ram TRX, F-150)
- `currentMods` (array of strings) — Installed modifications
- `targetHP` (number) — Horsepower goal
- `buildStage` (string enum) — stock | bolt-on | built | race

Current schema has: name, email, phone, notes, address.

Also store relevant fields in Medusa customer `metadata` for use in order flows.
