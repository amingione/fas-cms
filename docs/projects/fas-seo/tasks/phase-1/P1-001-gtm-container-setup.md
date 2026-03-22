---
id: P1-001
title: Set up GTM container and replace raw gtag.js
phase: 1
status: todo
priority: high
assignee: ""
depends_on: []
definition_of_done: |
  GTM container is created, configured, and loaded in BaseLayout.astro.
  Raw gtag.js script is replaced with GTM snippet.
  Page views still fire correctly in GA4.
verification_steps:
  - GTM container snippet present in src/layouts/BaseLayout.astro
  - GA4 page_view events still appear in GA4 real-time report
  - GTM preview mode shows container firing on all pages
  - No duplicate page_view events (raw gtag removed)
created: 2026-03-22
updated: 2026-03-22
---

## Description

Replace the current raw gtag.js implementation in `src/layouts/BaseLayout.astro` with a Google Tag Manager container. This is the foundation for all enhanced ecommerce tracking.

Current implementation loads gtag.js directly:
- GA4 ID: `G-NQ94Z6HWGV`
- Google Ads ID: `AW-17641771829`

Both must continue working after migration to GTM.

## Notes

- File: `src/layouts/BaseLayout.astro`
- Ensure Google Ads conversion tracking continues to work via GTM
- Ahrefs analytics script is separate and should not be affected
