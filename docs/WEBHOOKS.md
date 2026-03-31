# Webhook Inventory - fas-cms-fresh

**Last Updated:** 2026-03-30  
**Status:** Architecture-aligned  
**Canonical Authority:** `/Users/ambermin/LocalStorm/Workspace/DevProjects/GitHub/fas-sanity/AGENTS.md`

---

## Purpose

This document tracks webhook behavior relevant to `fas-cms-fresh` and prevents split authority.

If any statement here conflicts with `AGENTS.md`, `AGENTS.md` wins.

---

## Commerce Webhook Authority (Non-Negotiable)

- Medusa owns commerce webhook processing.
- Stripe is processed only via Medusa.
- Shippo is processed only via Medusa.
- `fas-cms-fresh` must not be a second commerce webhook authority.
- Sanity must not be a transactional webhook authority for checkout/order completion.

Canonical payment pipeline:

`Storefront -> Medusa cart/checkout -> Stripe payment -> Stripe webhook to Medusa -> Medusa order authority`

---

## Canonical Commerce Webhooks (Owned by fas-medusa)

### 1) Stripe Webhook (Authoritative)

- **Endpoint:** `https://api.fasmotorsports.com/webhooks/stripe`
- **Owner repo:** `fas-medusa`
- **Handler:** `fas-medusa/src/api/webhooks/stripe/route.ts`
- **Purpose:** Verify Stripe signature and complete Medusa cart/order lifecycle.
- **Required secret:** `STRIPE_WEBHOOK_SECRET` (in Medusa runtime)

### 2) Shippo Webhook (Authoritative)

- **Endpoint family:** Medusa `/webhooks/shippo` route
- **Owner repo:** `fas-medusa`
- **Handler:** `fas-medusa/src/api/webhooks/shippo/route.ts`
- **Purpose:** Handle shipment tracking updates inside Medusa workflows/event flow.

---

## fas-cms-fresh Webhook Endpoints (Current Status)

### A) `POST /api/medusa/webhooks/payment-intent`

- **File:** `src/pages/api/medusa/webhooks/payment-intent.ts`
- **Status:** `DEPRECATED` (returns `410 Gone`)
- **Reason:** Prevent duplicate Stripe webhook processing and split authority.
- **Action:** Do not register this URL in Stripe Dashboard.

### B) `POST /api/complete-order`

- **File:** `src/pages/api/complete-order.ts`
- **Status:** `DEPRECATED` (returns `410 Gone`)
- **Reason:** Order completion is webhook-only in Medusa.

### C) `POST /.netlify/functions/tracking-update`

- **File:** `netlify/functions/tracking-update.ts`
- **Status:** `DEPRECATED` no-op (returns `200` with deprecated notice)
- **Reason:** Legacy compatibility endpoint only; tracking updates must flow through Medusa.

### D) `POST /api/calcom/webhook`

- **File:** `src/pages/api/calcom/webhook.ts`
- **Status:** `ACTIVE` (non-commerce)
- **Purpose:** Handles Cal.com booking events and sends booking confirmation email.
- **Secret:** `CALCOM_WEBHOOK_SECRET`

---

## Stripe Dashboard Configuration

Use exactly one customer payment webhook destination for FAS checkout:

- `https://api.fasmotorsports.com/webhooks/stripe`

Do not keep any Stripe webhook target under `fasmotorsports.com/api/medusa/webhooks/*`.

---

## Operational Checks

1. Stripe webhook destination list contains only the Medusa canonical endpoint for checkout events.
2. Calls to `POST /api/medusa/webhooks/payment-intent` return `410`.
3. Calls to `POST /api/complete-order` return `410`.
4. `/.netlify/functions/tracking-update` returns deprecated no-op response.
5. Checkout completion still produces Medusa order creation via Stripe webhook events.

---

## Security Notes

- Verify webhook signatures in the owning system (Medusa for Stripe/Shippo, `fas-cms-fresh` for Cal.com).
- Keep webhook secrets in environment variables only.
- Maintain idempotent processing in authoritative webhook handlers.
- Do not route commerce completion logic through storefront or Sanity webhook handlers.

---

## Related References

- `fas-sanity/AGENTS.md` (architecture authority)
- `fas-medusa/src/api/webhooks/stripe/route.ts`
- `fas-medusa/src/api/webhooks/shippo/route.ts`
- `fas-cms-fresh/src/pages/api/medusa/webhooks/payment-intent.ts`
- `fas-cms-fresh/src/pages/api/complete-order.ts`
- `fas-cms-fresh/netlify/functions/tracking-update.ts`
