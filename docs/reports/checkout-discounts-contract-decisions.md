# Checkout Discounts Contract Decisions

**Contract Authority Decision Document**
**Date**: 2025-12-28
**Source**: docs/reports/checkout-discounts-audit.md (Gemini Audit)
**Repositories**: fas-cms-fresh (checkout + Stripe), fas-sanity (schema + Studio)

---

## 1. Executive Summary

Coupons cannot be entered today because the primary cart component (`ShoppingCart.tsx`) does not contain any UI element (input field or apply button) for users to enter a promotion code. While a complete backend promotion validation system exists at `/api/promotions/apply` with full business logic in `src/server/sanity/promotions.ts`, and Sanity promotion documents are fully defined and functional, the frontend cart UI has no mechanism to capture user input or invoke the existing backend endpoint. This is a pure UI gap, not a backend implementation gap.

---

## 2. Current State (Facts Only)

### 2.1 Checkout UI Behavior

- **File**: `src/components/storefront/ShoppingCart.tsx`
- **Current Behavior**:
  - Displays product-level sale prices correctly
  - NO input field for coupon/promotion code entry
  - NO "Apply" button to submit codes
  - NO client-side state for storing applied promotions
  - NO call to `/api/promotions/apply` endpoint

### 2.2 Stripe Checkout Configuration Behavior

- **File**: `src/pages/api/checkout.ts`
- **Current Behavior**:
  - Creates Stripe Checkout session via `stripe.checkout.sessions.create()`
  - Does NOT use Stripe's `discounts[]` parameter
  - Does NOT use Stripe's `allow_promotion_codes` parameter
  - Does NOT pass promotion codes to Stripe
  - Expects discount to be pre-calculated and subtracted from `unitAmount` before session creation
  - Application owns 100% of discount logic; Stripe has no knowledge of promotions

### 2.3 Sanity Discount/Promotion State

- **Promotion Documents** (`promotion` type in Sanity):
  - Fully implemented with fields: `code`, `discountType`, `discountValue`, `active`, `maxUses`, `currentUses`, `minimumPurchaseAmount`, `eligibleCustomers`
  - Business logic exists in `src/server/sanity/promotions.ts`
  - Validates: active status, usage limits, customer eligibility, minimum purchase amounts
  - Calculates: percentage or fixed-amount discounts
  - **Status**: Backend complete, unused by frontend

- **Customer Discount Objects** (synced from Stripe):
  - Stored on Sanity `customer` documents
  - Data source: Stripe customer discount sync
  - **Status**: Ignored by checkout flow (`src/pages/api/checkout.ts` does not read or apply these)

### 2.4 Customer Discount Handling

- **Current Behavior**:
  - Stripe customer-level discounts are synced to Sanity `customer` documents
  - Checkout API does NOT query customer discounts
  - Checkout API does NOT apply customer discounts
  - **Status**: Dead code path

---

## 3. Approved Decisions

### 3.1 UI Decisions

#### ✅ APPROVED: Add Coupon Input to Shopping Cart

- **Location**: `src/components/storefront/ShoppingCart.tsx`
- **Elements Required**:
  - Text input field for promotion code entry
  - "Apply" button to submit code
  - Display area for applied promotion details (code name, discount amount)
  - Error message display for invalid codes
  - Client-side cart state to track applied promotion

#### ✅ APPROVED: UI Calls Existing Backend Endpoint

- **Endpoint**: `/api/promotions/apply`
- **Method**: POST
- **Request Payload**:
  - `promotionCode`: string
  - `cartItems`: array of {productId, variantId, quantity, price}
- **Response Contract**: Must match existing endpoint response structure
- **Error Handling**: Display backend validation errors to user

#### ❌ EXPLICITLY OUT OF SCOPE: Stripe Native Promotion Codes

- Stripe's `allow_promotion_codes` parameter will NOT be enabled
- Stripe's promotion code UI will NOT be used
- Application maintains full control over discount logic
- Rationale: Existing architecture pre-calculates discounts; Stripe is a payment processor only

#### ❌ EXPLICITLY OUT OF SCOPE: Customer-Level Discounts at Checkout

- Stripe customer discounts synced to Sanity will NOT be surfaced in checkout
- Checkout will NOT query or apply customer-level discounts
- Rationale: Per audit finding, customer discount objects are unused; no business requirement identified

### 3.2 API Decisions

#### ✅ APPROVED: Use Existing `/api/promotions/apply` Endpoint

- **File**: `src/pages/api/promotions/apply.ts`
- **Current Status**: Fully implemented, unused
- **Change Required**: None (endpoint is contract-complete)
- **Validation Rules** (existing, do not modify):
  - Promotion must be active
  - Promotion must not exceed usage limits
  - Cart total must meet minimum purchase amount
  - Customer must be in eligible customer list (if specified)

#### ✅ APPROVED: Discount Applied Before Stripe Session Creation

- **Flow**:
  1. User applies promotion in cart UI
  2. Frontend calls `/api/promotions/apply`
  3. Frontend updates cart state with discounted prices
  4. User clicks "Checkout"
  5. `/api/checkout.ts` receives pre-discounted line items
  6. Stripe session created with final prices
- **Rationale**: Matches existing architecture where Stripe receives final prices only

#### 🟡 DEFERRED: Promotion Code Persistence Across Sessions

- Promotion codes applied in cart state are NOT persisted to database
- Cart state is client-side only
- If user refreshes page, applied promotion is lost
- **Deferred Decision**: Persistence mechanism not defined in audit

### 3.3 Stripe Decisions

#### ✅ APPROVED: Continue Pre-Calculated Price Strategy

- **File**: `src/pages/api/checkout.ts`
- **Behavior**:
  - Discount subtracted from `unitAmount` before `stripe.checkout.sessions.create()`
  - Stripe receives final, discounted price only
  - No Stripe discount metadata passed

#### ❌ EXPLICITLY OUT OF SCOPE: Stripe Discount Metadata

- Will NOT pass promotion code to Stripe session metadata
- Will NOT use Stripe's `discounts[]` parameter
- Will NOT store promotion code in Stripe payment metadata
- Rationale: Promotion tracking handled by Sanity, not Stripe

#### 🟡 DEFERRED: Order-Level Promotion Tracking

- No decision on whether applied promotion codes should be stored on order documents
- No decision on post-purchase promotion analytics
- Audit does not specify requirement

### 3.4 Sanity Decisions

#### ✅ APPROVED: Sanity Promotions Are Source of Truth

- **Repository**: fas-sanity
- **Document Type**: `promotion`
- **Fields Used** (existing schema, do not modify):
  - `code` (string, unique identifier)
  - `discountType` (enum: percentage | fixed)
  - `discountValue` (number)
  - `active` (boolean)
  - `maxUses` (number, optional)
  - `currentUses` (number)
  - `minimumPurchaseAmount` (number, optional)
  - `eligibleCustomers` (array of customer references, optional)

#### ❌ EXPLICITLY OUT OF SCOPE: Stripe Customer Discount Integration

- Sanity `customer.discounts` objects will NOT be used by checkout
- Stripe customer discount sync continues but data remains unused
- No requirement to reconcile Stripe discounts with Sanity promotions

#### ❌ EXPLICITLY OUT OF SCOPE: New Promotion Fields

- No new fields to be added to `promotion` schema
- No modification to existing validation logic in `src/server/sanity/promotions.ts`
- Existing business rules are contract-complete

---

## 4. Enforcement Rules (for Codex)

### 4.1 What Codex MAY Change

**fas-cms-fresh repository ONLY**:

- ✅ MAY add UI elements to `src/components/storefront/ShoppingCart.tsx`:
  - Input field for promotion code
  - Apply button
  - Display area for applied promotion
  - Error message display

- ✅ MAY add client-side cart state management for applied promotions

- ✅ MAY add HTTP client call to `/api/promotions/apply` from cart component

- ✅ MAY modify cart state update logic to reflect discounted prices after promotion applied

- ✅ MAY add UI loading/error states during promotion validation

### 4.2 What Codex MUST NOT Change

**Backend/API (fas-cms-fresh)**:
- ❌ MUST NOT modify `/api/promotions/apply.ts` logic
- ❌ MUST NOT modify `src/server/sanity/promotions.ts` validation rules
- ❌ MUST NOT modify `/api/checkout.ts` Stripe session creation (except to handle pre-discounted prices from cart state)
- ❌ MUST NOT add Stripe discount parameters to checkout session

**Schema/Studio (fas-sanity)**:
- ❌ MUST NOT modify `promotion` document schema
- ❌ MUST NOT create new discount/promotion document types
- ❌ MUST NOT modify customer discount sync logic

**Cross-Repository**:
- ❌ MUST NOT implement customer-level discount features
- ❌ MUST NOT integrate Stripe native promotion codes
- ❌ MUST NOT create promotion-to-order linking (deferred)

### 4.3 Repository Ownership

| Responsibility | Repository | Files |
|---|---|---|
| Promotion schema definition | fas-sanity | `promotion` document type |
| Promotion validation logic | fas-cms-fresh | `src/server/sanity/promotions.ts` |
| Promotion application API | fas-cms-fresh | `src/pages/api/promotions/apply.ts` |
| Cart UI with coupon input | fas-cms-fresh | `src/components/storefront/ShoppingCart.tsx` |
| Stripe checkout session | fas-cms-fresh | `src/pages/api/checkout.ts` |
| Customer discount sync (unused) | fas-cms-fresh | Checkout ignores; no changes allowed |

---

## 5. Required Implementation Order

**Strict Dependency Sequence**:

### Phase 1: UI (fas-cms-fresh)
**File**: `src/components/storefront/ShoppingCart.tsx`

Must implement BEFORE any other changes:
1. Add promotion code input field
2. Add apply button
3. Add client-side state for applied promotion
4. Add HTTP client call to `/api/promotions/apply`
5. Add display for applied promotion details
6. Add error message display

**Validation Criteria**: UI must successfully call existing endpoint and display response

---

### Phase 2: API Integration (fas-cms-fresh)
**File**: `src/components/storefront/ShoppingCart.tsx` (cart state management)

Must implement AFTER Phase 1:
1. Update cart state with discounted prices from promotion response
2. Recalculate cart total with discount applied
3. Pass discounted line items to checkout flow

**Validation Criteria**: Cart state reflects discounted prices; checkout receives correct values

---

### Phase 3: Stripe Session (fas-cms-fresh)
**File**: `src/pages/api/checkout.ts`

Must implement AFTER Phase 2:
1. Verify checkout receives pre-discounted prices from cart
2. No changes required unless cart state structure changes

**Validation Criteria**: Stripe session created with correct final prices

---

### Phase 4: Sanity Verification (fas-sanity)
**Repository**: fas-sanity

Must verify AFTER Phase 3:
1. Confirm `promotion` documents exist and are queryable
2. Confirm `currentUses` increments after successful application
3. No schema changes allowed

**Validation Criteria**: Promotion usage tracking works correctly

---

## 6. Explicit Non-Goals

### 6.1 Will NOT Be Implemented

❌ **Stripe Native Promotion Codes**
- Rationale: Architecture uses pre-calculated prices; Stripe is payment processor only
- Source: Audit finding on checkout.ts behavior

❌ **Customer-Level Discounts at Checkout**
- Rationale: Customer discount objects are synced but unused; no business requirement identified
- Source: Audit finding on customer discount handling

❌ **Promotion Code Persistence Across Sessions**
- Rationale: Not specified in audit; requires cart persistence decision
- Status: Deferred to future work

❌ **Order-Level Promotion Tracking**
- Rationale: Not specified in audit; requires analytics decision
- Status: Deferred to future work

❌ **Stripe Metadata for Promotions**
- Rationale: Promotion data lives in Sanity, not Stripe
- Source: Architecture decision from audit

❌ **New Promotion Fields or Rules**
- Rationale: Existing promotion system is contract-complete
- Source: Audit confirms backend logic is fully implemented

❌ **Modifications to fas-sanity Schema**
- Rationale: Promotion schema is authoritative and complete
- Source: Audit finding on Sanity promotions

### 6.2 Future Work (Explicitly Excluded from Current Scope)

🟡 **Cart State Persistence**
- Browser refresh loses applied promotion
- Requires session storage or database cart implementation
- Not covered by audit

🟡 **Promotion Analytics**
- Tracking which promotions are used most
- Reporting on discount impact
- Not covered by audit

🟡 **Customer Discount Integration**
- Reconciling Stripe customer discounts with Sanity promotions
- Surfacing customer-level discounts in checkout
- Not covered by audit

🟡 **Promotion Stacking**
- Applying multiple promotions to single order
- Requires business rules not defined in audit

---

## 7. Contract Verification Checklist

This document is contract-complete if:

- ✅ Codex can implement UI changes without asking which files to modify
- ✅ Codex knows exactly which endpoint to call and what payload to send
- ✅ Codex knows what NOT to change (backend logic, schema, Stripe params)
- ✅ Codex knows implementation order (UI → API Integration → Stripe → Sanity)
- ✅ All decisions are traceable to audit findings
- ✅ No ambiguity about repository ownership
- ✅ No implied behavior requires interpretation

**Contract Status**: ✅ READY FOR CODEX IMPLEMENTATION

---

**End of Contract Document**
