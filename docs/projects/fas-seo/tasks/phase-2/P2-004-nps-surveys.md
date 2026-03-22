---
id: P2-004
title: Deploy post-purchase NPS surveys
phase: 2
status: todo
priority: medium
assignee: ""
depends_on: []
definition_of_done: |
  NPS survey email sent automatically after package purchases.
  Responses stored in Sanity.
  Response rate tracked.
verification_steps:
  - Package purchase triggers NPS email via Resend
  - Survey link works and captures score + comment
  - Response stored in Sanity with order reference
  - Response rate calculated and visible
created: 2026-03-22
updated: 2026-03-22
---

## Description

Deploy Net Promoter Score surveys for package customers (FAS500–FAS1000).

- Send via Resend (already configured: `RESEND_API_KEY`)
- Trigger after order delivery (or N days after purchase)
- Store responses in Sanity
- Target: >15% response rate
