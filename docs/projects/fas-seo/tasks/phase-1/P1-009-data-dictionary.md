---
id: P1-009
title: Complete and publish data dictionary
phase: 1
status: todo
priority: medium
assignee: ""
depends_on: []
definition_of_done: |
  Data dictionary documents all Sanity schemas, Medusa entities,
  and API contracts with verified field names and types.
verification_steps:
  - All 11 Sanity schemas documented with field-level detail
  - Key Medusa endpoints documented with request/response shapes
  - Event names and data mappings are accurate
  - Cross-referenced with actual codebase (not invented)
created: 2026-03-22
updated: 2026-03-22
---

## Description

Complete the data dictionary at `docs/projects/fas-seo/data-dictionary.md`.

Initial version is seeded from codebase inspection. Remaining work:
- Verify Medusa entity details from fas-medusa repo
- Document Medusa customer metadata fields
- Add any missing Sanity schema fields
- Document webhook event payloads

See [data-dictionary.md](../../data-dictionary.md) for current state.
