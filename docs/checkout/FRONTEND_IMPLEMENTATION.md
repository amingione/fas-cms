# Checkout Implementation - Phase 1 Frontend

## Overview

This document describes the frontend implementation of the single-page checkout flow for the FAS Motorsports commerce system, following the specification in `docs/checkout/checkout-flow-spec.md`.

## Architecture

### Medusa-First Approach

- **Medusa** is authoritative for: products, pricing, inventory, cart, shipping, tax, totals, orders
- **Stripe** is payment-only: receives final amount via PaymentIntent (no line items, addresses, shipping, or tax)
- **Frontend** manages UI state and orchestrates API calls

### State Machine

The checkout implements a 13-state machine with explicit transitions:

```
CART_LOADING → ADDRESS_ENTRY → SHIPPING_CALCULATION → SHIPPING_SELECTION → 
SHIPPING_APPLYING → CART_FINALIZED → PAYMENT_INTENT_CREATING (LOCK) → 
PAYMENT_READY → PAYMENT_PROCESSING → PAYMENT_SUCCESS
```

**Lock Point:** `PAYMENT_INTENT_CREATING` - After this state, cart becomes immutable.

## Files Created

### Core State Management

- `/src/lib/checkout/types.ts` - TypeScript type definitions
- `/src/lib/checkout/state-machine.ts` - State reducer and transition logic
- `/src/lib/checkout/utils.ts` - API utilities and helpers

### React Components

- `/src/components/checkout/CheckoutFlow.tsx` - Main orchestrator component
- `/src/components/checkout/AddressForm.tsx` - Address collection form
- `/src/components/checkout/ShippingSelector.tsx` - Shipping method selection
- `/src/components/checkout/OrderSummary.tsx` - Cart display sidebar
- `/src/components/checkout/StripePayment.tsx` - Stripe Elements integration

### Pages

- `/src/pages/checkout/index.astro` - Main checkout page (updated)
- `/src/pages/checkout/success.astro` - Payment success page (updated)

## State Machine Details

### States

1. **CART_LOADING** - Initial load
2. **CART_EMPTY** - No items (terminal)
3. **ADDRESS_ENTRY** - User enters shipping address
4. **SHIPPING_CALCULATION** - Fetching shipping options from Medusa
5. **SHIPPING_SELECTION** - User selects shipping method
6. **SHIPPING_APPLYING** - Applying shipping to cart
7. **CART_FINALIZED** - Review order before payment
8. **PAYMENT_INTENT_CREATING** - Creating Stripe PaymentIntent (LOCK POINT)
9. **PAYMENT_READY** - User enters payment details
10. **PAYMENT_PROCESSING** - Payment being processed
11. **PAYMENT_SUCCESS** - Order complete (terminal)
12. **PAYMENT_FAILED** - Payment declined (recoverable)
13. **SHIPPING_ERROR** - Shipping calculation failed (recoverable)
14. **PAYMENT_INTENT_ERROR** - PaymentIntent creation failed (recoverable)

### Cart Lock Enforcement

After `PAYMENT_INTENT_CREATING` state:

- ❌ Cannot edit address
- ❌ Cannot change shipping
- ❌ Cannot modify cart items
- ❌ Cannot apply discounts
- ✅ Can retry payment with same intent
- ✅ Can start over (creates new cart)

## API Interaction Flow

### 1. Initial Cart Load
```
GET /store/carts/{cartId}
```

### 2. Address Submission
```
POST /store/carts/{cartId}
Body: { email, shipping_address }
```

### 3. Fetch Shipping Options
```
GET /store/shipping-options?cart_id={cartId}
```

### 4. Apply Shipping Method
```
POST /store/carts/{cartId}/shipping-methods
Body: { option_id }
```

### 5. Create PaymentIntent
```
POST /api/medusa/payments/create-intent
Body: { cartId }
```

### 6. Confirm Payment (Stripe)
```
stripe.confirmPayment({ elements, confirmParams })
```

### 7. Webhook Processing (Backend)
```
POST /api/medusa/webhooks/payment-intent
Stripe sends: payment_intent.succeeded
Backend completes order in Medusa
```

## Key Features

### Prevents Known Issues

1. **Product Duplication** - Cart locked after intent creation
2. **Tax Calculation** - Tax calculated by Medusa only, based on address
3. **Quantity Multiplication** - State machine prevents duplicate API calls
4. **USPS Filtering** - Only UPS carriers shown (filtered client-side)
5. **Cart Mutation** - Webhook validates total matches intent amount

### Error Handling

- Missing address → return to ADDRESS_ENTRY
- Missing shipping → return to SHIPPING_SELECTION
- Shipping calculation failure → retry or edit address
- PaymentIntent creation failure → retry or start over
- Payment declined → retry with same intent or start over

### Loading States

- **Instant (0-100ms)** - Button clicks, form validation
- **Fast (100ms-1s)** - Field validation
- **Slow (1s-3s)** - API calls (address, shipping, intent)
- **Very Slow (3s+)** - Payment processing

## Testing Checklist

### Manual Testing

- [ ] Load checkout with valid cart
- [ ] Load checkout with empty cart
- [ ] Submit valid address
- [ ] Submit invalid address (validation)
- [ ] Select shipping method
- [ ] Try to edit address after lock (should block)
- [ ] Create PaymentIntent successfully
- [ ] Submit payment successfully
- [ ] Handle payment decline
- [ ] Test page refresh at each state

### Integration Testing

- [ ] Verify cart totals match Medusa
- [ ] Verify shipping options filtered correctly
- [ ] Verify PaymentIntent amount matches cart.total
- [ ] Verify webhook completes order
- [ ] Verify Sanity order creation
- [ ] Verify cart cleared after success

## Configuration Required

### Environment Variables

Already configured:
- ✅ `PUBLIC_STRIPE_PUBLISHABLE_KEY`
- ✅ `MEDUSA_BACKEND_URL`
- ✅ `MEDUSA_PUBLISHABLE_KEY`
- ✅ `STRIPE_WEBHOOK_SECRET`

### Stripe Dashboard

Configure webhook endpoint:
```
URL: https://yourdomain.com/api/medusa/webhooks/payment-intent
Events: payment_intent.succeeded
```

## Deployment Notes

### Pre-Deployment

1. Test checkout flow end-to-end in staging
2. Verify webhook signature verification works
3. Verify success page redirects correctly
4. Test cart lock behavior
5. Test error scenarios

### Post-Deployment

1. Monitor checkout completion rate
2. Monitor PaymentIntent creation failures
3. Monitor webhook errors
4. Monitor cart mutation detection logs

## Known Limitations

1. Only UPS shipping supported (USPS filtered out)
2. Only USD currency supported in UI formatting
3. Only US addresses supported (state dropdown)
4. No discount code UI (to be added later)
5. No gift card support (to be added later)

## Future Enhancements (Phase 2+)

- [ ] Add discount code input field
- [ ] Add gift card support
- [ ] Add saved addresses for logged-in users
- [ ] Add order tracking page
- [ ] Add real-time shipping estimates (delivery date)
- [ ] Add international shipping support
- [ ] Add multiple payment methods (PayPal, etc.)
- [ ] Add analytics tracking

## Maintenance

### Updating States

To add/modify states:
1. Update `CheckoutState` type in `types.ts`
2. Update `checkoutReducer` in `state-machine.ts`
3. Add corresponding UI in `CheckoutFlow.tsx`

### Updating Validation

Address validation is in `AddressForm.tsx` (lines 94-116).
Email validation regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
ZIP validation regex: `/^\d{5}(-\d{4})?$/`

### Debugging

Enable state logging in `state-machine.ts`:
```typescript
console.log('[Checkout State]', state, '→', action.type);
```

## Support

For issues or questions:
- Refer to specification: `docs/checkout/checkout-flow-spec.md`
- Check backend docs: `PHASE1_PAYMENTINTENT_IMPLEMENTATION.md`
- Review state machine logic: `src/lib/checkout/state-machine.ts`

---

**Implementation Date:** January 31, 2026  
**Specification Version:** 1.0  
**Status:** ✅ Complete (Frontend Phase 1)
