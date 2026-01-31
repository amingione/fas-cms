# Legacy API Routes - Archived

**Archive Date:** 2026-01-31  
**Phase:** Phase 3 Cleanup  
**Status:** ARCHIVED - Do NOT reintroduce into runtime

---

## Purpose

This directory contains API routes that were part of the legacy Stripe Hosted Checkout flow. These routes have been **replaced** by the new Medusa-first PaymentIntent flow and are retained here only for:

1. Historical reference
2. Debugging legacy orders
3. Documentation of the migration path
4. Audit trail for compliance

**These routes are NOT active in production.**

---

## Archived Routes

### 1. Stripe Hosted Checkout (Legacy)

**File:** `stripe/create-checkout-session.ts`  
**Original Path:** `/api/stripe/create-checkout-session`  
**Archived:** 2026-01-31  
**Replaced By:** `/api/medusa/payments/create-intent` (PaymentIntent flow)

**Why Archived:**
- Sends line items, shipping, and tax data to Stripe (violates Medusa-first authority model)
- Uses Stripe Checkout Sessions instead of PaymentIntents
- Collects address and shipping in Stripe UI (duplicates Medusa data)
- Creates risk of cart mutation and pricing drift

**New Flow:**
- Address collected in `/checkout` page (Medusa manages)
- Shipping calculated by Medusa
- Tax calculated by Medusa
- Stripe receives only final amount via PaymentIntent
- Cart locked before payment to prevent duplication

---

### 2. Legacy Checkout Session Webhook

**File:** `webhooks.ts`  
**Original Path:** `/api/webhooks`  
**Archived:** 2026-01-31  
**Replaced By:** `/api/medusa/webhooks/payment-intent`

**Why Archived:**
- Handles `checkout.session.completed` events (legacy flow)
- Creates orders directly in Sanity, bypassing Medusa
- Violates Sanity's role as read-only office dashboard
- No cart mutation validation

**New Flow:**
- Webhook handles `payment_intent.succeeded` events
- Order created in Medusa first (authoritative)
- Order mirrored to Sanity for ops visibility
- Cart mutation detection prevents total drift

---

### 3. Direct Sanity Order Creation

**File:** `save-order.ts`  
**Original Path:** `/api/save-order`  
**Archived:** 2026-01-31  
**Replaced By:** Medusa order creation + webhook mirror

**Why Archived:**
- Creates orders directly in Sanity from Stripe data
- Violates Medusa-first authority model
- Sanity should be read-only mirror + ops annotations only
- No validation against Medusa cart state

**New Flow:**
- Orders created in Medusa first
- Webhook mirrors order to Sanity after creation
- Sanity stores ops annotations (notes, flags, attachments)
- Sanity never computes totals or creates orders

---

### 4. Legacy Medusa Checkout Sessions

**Files:**
- `medusa/checkout/create-session.ts`
- `medusa/checkout/complete.ts`

**Original Paths:**
- `/api/medusa/checkout/create-session`
- `/api/medusa/checkout/complete`

**Archived:** 2026-01-31  
**Replaced By:** 
- `/api/medusa/payments/create-intent` (creation)
- `/api/medusa/webhooks/payment-intent` (completion)

**Why Archived:**
- Implements old Checkout Session flow (not PaymentIntents)
- No cart lock mechanism (allows mutation after payment intent)
- Session-based completion instead of webhook-driven
- No protection against product duplication or cart drift

**New Flow:**
- PaymentIntent created after cart is finalized
- Cart enters LOCKED state (immutable)
- Webhook completes order after payment success
- Cart mutation detection validates total matches

---

### 5. Legacy Shipping Quote Endpoint

**File:** `quote.ts`  
**Original Path:** `/api/shipping/quote`  
**Archived:** 2026-01-31  
**Status:** Already disabled (returned 410 Gone)

**Why Archived:**
- Calculated shipping quotes outside of Medusa
- Used by legacy Stripe Checkout flow
- Shipping now handled entirely in Medusa
- Redundant with Medusa shipping calculation

**New Flow:**
- Shipping options fetched via `/store/shipping-options`
- Shipping applied via `/store/carts/{id}/shipping-methods`
- All shipping logic in Medusa (authoritative)

---

## Replacement Architecture

### Old Flow (Legacy - Archived)
```
1. User adds items to cart
2. Frontend calls /api/stripe/create-checkout-session
3. Stripe Checkout UI collects address + shipping
4. Stripe calculates tax (or uses frontend calculation)
5. Payment processed in Stripe
6. Webhook (/api/webhooks) creates order in Sanity
7. Optional: Mirror to Medusa later
```

**Problems:**
- Address collected twice (frontend + Stripe)
- Shipping calculated in Stripe (not Medusa)
- Tax calculated outside Medusa
- Orders created in Sanity first (violates authority model)
- Cart mutation possible after checkout session creation
- Product duplication and quantity multiplication bugs
- No cart lock mechanism

### New Flow (Active - Production)
```
1. User adds items to cart (Medusa)
2. User navigates to /checkout
3. Address entered once → Medusa calculates tax
4. Shipping selected once → Medusa finalizes cart
5. PaymentIntent created → Cart enters LOCKED state
6. Stripe Elements shows payment form (no address/shipping)
7. Payment processed via stripe.confirmPayment()
8. Webhook (/api/medusa/webhooks/payment-intent) fires
9. Order created in Medusa (authoritative)
10. Order mirrored to Sanity (read-only + ops annotations)
```

**Benefits:**
- Single source of truth (Medusa)
- Address collected once
- Shipping calculated once
- Tax calculated once
- Cart locked before payment (prevents mutation)
- Cart mutation detection in webhook
- No product duplication
- No quantity multiplication
- Sanity as read-only office dashboard

---

## When Can These Files Be Deleted?

**Safe to delete after:**
- 6 months from archive date (2026-07-31)
- Confirmation that no legacy Checkout Session orders are pending
- Stripe webhook fully migrated to new endpoint
- No 404 errors logged for these paths
- All historical order data migrated/validated

**Before deletion:**
- Review Stripe webhook configuration
- Confirm no pending refunds on legacy orders
- Update any remaining documentation references
- Archive git history for compliance

---

## Related Documentation

**Authoritative References:**
- `docs/checkout/checkout-flow-spec.md` - New checkout specification
- `docs/checkout/FRONTEND_IMPLEMENTATION.md` - Implementation guide
- `docs/STEP2_ALIGNMENT_AUDIT.md` - Route audit and deprecation
- `docs/PHASE3_ARCHIVAL_LOG.md` - Detailed archival log
- `docs/WEBHOOKS.md` - Active webhook inventory

**Architecture Documentation:**
- `fas-sanity/docs/office-dashboard-role-definition.md` - Sanity role
- `fas-sanity/docs/audits/sanity-office-dashboard-schema-audit-2026-01-31.md` - Schema audit

---

## Migration Notes

**For Developers:**
- DO NOT import functions from this directory
- DO NOT reintroduce these patterns in new code
- DO NOT expose these routes to production traffic
- If debugging legacy orders, use read-only queries only

**For Ops:**
- Legacy orders can still be viewed in Sanity
- Refunds for legacy orders must go through Medusa Admin
- Shipping updates should be made in Medusa, not Sanity

**For Product:**
- Legacy checkout flow is DEPRECATED
- All new checkouts use PaymentIntent flow
- Migration was completed 2026-01-31

---

## Security Notes

These files are retained in the repository but:
- Are NOT deployed to production
- Are NOT exposed via routing
- Cannot be accessed via URL
- Serve only as historical reference

If these routes are accidentally exposed, they will:
- Violate the authority model
- Create pricing drift risk
- Bypass cart lock mechanism
- Potentially duplicate orders

**Do NOT make these routes active again.**

---

**Archive Completed:** 2026-01-31  
**Next Review:** 2026-07-31 (consider deletion)  
**Archived By:** AI Senior Systems Engineer (Phase 3 Cleanup)
