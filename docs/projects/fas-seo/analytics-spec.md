# GA4 Enhanced Ecommerce — Analytics Specification

## Overview

This spec defines the GA4 event taxonomy for FAS Motorsports enhanced ecommerce tracking. Events are fired both client-side (via GTM dataLayer) and server-side (via Measurement Protocol) with a deduplication strategy.

## Current State

- GA4 is loaded via gtag.js in `src/layouts/BaseLayout.astro`
- Measurement ID: `G-NQ94Z6HWGV`
- Only `page_view` fires (default gtag behavior)
- No enhanced ecommerce events are implemented
- No GTM container is configured (currently using raw gtag.js)

## Implementation Approach

### Client-Side: GTM dataLayer
- Replace or augment raw gtag.js with GTM container
- Push structured events to `window.dataLayer`
- GTM tags fire GA4 events

### Server-Side: Measurement Protocol
- Medusa order events → GA4 via Measurement Protocol API
- Used for `purchase` and `refund` events (server-authoritative)
- Requires GA4 Measurement Protocol API secret

---

## Event Taxonomy

### 1. `view_item`

**When:** Customer views a product detail page or quick-view modal.

**Where to fire:** Client-side via GTM dataLayer

**Source files:**
- Product pages in `src/pages/` (builds, packages, specs, wheels)
- `src/components/storefront/ProductQuickViewButton.tsx`

**Required Parameters:**

| Parameter | Type | Source | Description |
|-----------|------|--------|-------------|
| `currency` | string | Medusa region | `"USD"` |
| `value` | number | Medusa product variant | Product price |
| `items[]` | array | Medusa product | Array of item objects |
| `items[].item_id` | string | Medusa `variant_id` | Variant identifier |
| `items[].item_name` | string | Medusa `product.title` | Product name |
| `items[].price` | number | Medusa variant price | Unit price |
| `items[].quantity` | number | — | `1` |

**Recommended Custom Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `platform` | string | Vehicle platform (e.g., `"S550 Mustang"`, `"Ram TRX"`) |
| `product_category` | string | Category (e.g., `"pulleys"`, `"packages"`, `"wheels"`) |
| `build_stage` | string | Target build stage (if applicable) |

**dataLayer push:**
```javascript
window.dataLayer.push({
  event: 'view_item',
  ecommerce: {
    currency: 'USD',
    value: 219.99,
    items: [{
      item_id: 'variant_abc123',
      item_name: 'FAS Lightweight Crank Pulley - S550',
      price: 219.99,
      quantity: 1,
      platform: 'S550 Mustang',
      product_category: 'pulleys'
    }]
  }
});
```

---

### 2. `add_to_cart`

**When:** Customer adds an item to cart.

**Where to fire:** Client-side via GTM dataLayer

**Source files:**
- `src/components/cart/add-to-cart.tsx`
- `src/components/cart/actions.ts` (addToCart function)
- Fire AFTER successful Medusa cart API response

**Required Parameters:**

| Parameter | Type | Source | Description |
|-----------|------|--------|-------------|
| `currency` | string | Medusa region | `"USD"` |
| `value` | number | Medusa variant | Total value added |
| `items[]` | array | Medusa response | Items added |
| `items[].item_id` | string | Medusa `variant_id` | Variant identifier |
| `items[].item_name` | string | Product title | Product name |
| `items[].price` | number | Variant price | Unit price |
| `items[].quantity` | number | User selection | Quantity added |

**Recommended Custom Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `platform` | string | Vehicle platform |
| `product_category` | string | Product category |
| `cart_id` | string | Medusa cart ID (for cross-referencing) |

**dataLayer push:**
```javascript
window.dataLayer.push({
  event: 'add_to_cart',
  ecommerce: {
    currency: 'USD',
    value: 219.99,
    items: [{
      item_id: 'variant_abc123',
      item_name: 'FAS Lightweight Crank Pulley - S550',
      price: 219.99,
      quantity: 1,
      platform: 'S550 Mustang',
      product_category: 'pulleys'
    }]
  }
});
```

**Implementation note:** The `add-to-cart.tsx` component and `actions.ts` module handle the Medusa API call. The dataLayer push should fire in the `.then()` callback after the API confirms the item was added.

---

### 3. `begin_checkout`

**When:** Customer lands on the checkout page with a valid cart.

**Where to fire:** Client-side via GTM dataLayer

**Source files:**
- `src/pages/checkout.astro` — page mount
- `src/components/checkout/CheckoutForm.tsx` — React island initialization

**Required Parameters:**

| Parameter | Type | Source | Description |
|-----------|------|--------|-------------|
| `currency` | string | Medusa cart | `"USD"` |
| `value` | number | Medusa cart total | Cart subtotal |
| `items[]` | array | Medusa cart items | All cart items |
| `coupon` | string | Medusa cart discount | Applied coupon code (if any) |

**Recommended Custom Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `cart_id` | string | Medusa cart ID |
| `item_count` | number | Total items in cart |
| `has_package` | boolean | Whether cart contains a FAS package product |

**dataLayer push:**
```javascript
window.dataLayer.push({
  event: 'begin_checkout',
  ecommerce: {
    currency: 'USD',
    value: 1299.99,
    coupon: 'SPRING25',
    items: [
      {
        item_id: 'variant_abc123',
        item_name: 'FAS500 Power Package - S550',
        price: 1299.99,
        quantity: 1,
        platform: 'S550 Mustang',
        product_category: 'packages'
      }
    ]
  }
});
```

**Implementation note:** Fire once when `CheckoutForm.tsx` mounts with a valid cart, not on every re-render. Use a `useEffect` with an `eventFired` ref to prevent duplicates.

---

### 4. `purchase`

**When:** Order is successfully completed.

**Where to fire:** BOTH client-side AND server-side (with deduplication).

#### Client-Side (GTM)

**Source file:** `src/pages/order/confirmation.astro` — fire on order confirmation page load.

**Required Parameters:**

| Parameter | Type | Source | Description |
|-----------|------|--------|-------------|
| `transaction_id` | string | Medusa order ID | Unique order identifier |
| `currency` | string | Order currency | `"USD"` |
| `value` | number | Order total | Total revenue |
| `tax` | number | Order tax | Tax amount |
| `shipping` | number | Order shipping | Shipping cost |
| `items[]` | array | Order line items | All purchased items |
| `coupon` | string | Discount code | Applied coupon (if any) |

**Recommended Custom Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `platform` | string | Primary vehicle platform in order |
| `customer_type` | string | `"new"` or `"returning"` |
| `build_stage` | string | Customer's build stage |
| `payment_method` | string | Payment method type |

**dataLayer push:**
```javascript
window.dataLayer.push({
  event: 'purchase',
  ecommerce: {
    transaction_id: 'order_fas_12345',
    currency: 'USD',
    value: 1399.99,
    tax: 112.00,
    shipping: 0,
    coupon: 'SPRING25',
    items: [{
      item_id: 'variant_abc123',
      item_name: 'FAS500 Power Package - S550',
      price: 1299.99,
      quantity: 1,
      platform: 'S550 Mustang',
      product_category: 'packages'
    }]
  }
});
```

#### Server-Side (Measurement Protocol)

**Trigger:** Medusa `order.placed` event (or equivalent) — NEEDS CONFIRMATION on exact event name.

**Endpoint:** `POST https://www.google-analytics.com/mp/collect?measurement_id=G-NQ94Z6HWGV&api_secret=<secret>`

**Payload:**
```json
{
  "client_id": "<ga_client_id_from_cookie>",
  "events": [{
    "name": "purchase",
    "params": {
      "transaction_id": "order_fas_12345",
      "currency": "USD",
      "value": 1399.99,
      "tax": 112.00,
      "shipping": 0,
      "items": [...]
    }
  }]
}
```

**Note:** Server-side purchase requires the GA4 `client_id` from the `_ga` cookie. This must be captured during checkout and stored with the order in Medusa metadata.

---

## Deduplication Strategy

### Problem
Purchase events fire both client-side (confirmation page) and server-side (Medusa webhook). Without deduplication, revenue will be double-counted.

### Solution: `event_id` Parameter

1. Generate a unique `event_id` at purchase time using the Medusa `transaction_id` (order ID).
2. Include `event_id` in BOTH client-side and server-side purchase events.
3. GA4 automatically deduplicates events with the same `event_id` + `event_name` within a 48-hour window.

```javascript
// Client-side
window.dataLayer.push({
  event: 'purchase',
  event_id: 'order_fas_12345',  // Same as transaction_id
  ecommerce: { transaction_id: 'order_fas_12345', ... }
});
```

```json
// Server-side
{
  "events": [{
    "name": "purchase",
    "params": {
      "event_id": "order_fas_12345",
      "transaction_id": "order_fas_12345"
    }
  }]
}
```

### Fallback
If GA4 deduplication is insufficient (e.g., timing issues), implement a flag:
- On successful client-side fire, set `localStorage.setItem('purchase_tracked_' + orderId, 'true')`
- On confirmation page load, check flag before firing
- Server-side always fires as the authoritative source

---

## Custom Dimensions (GA4 Configuration)

Register these as custom dimensions in GA4 Admin:

| Dimension Name | Scope | Parameter Name | Description |
|----------------|-------|----------------|-------------|
| Vehicle Platform | Event | `platform` | e.g., S550 Mustang, Ram TRX |
| Build Stage | User | `build_stage` | stock, bolt-on, built, race |
| Product Category | Event | `product_category` | pulleys, packages, wheels, etc. |
| Customer Type | User | `customer_type` | new, returning |
| Cart ID | Event | `cart_id` | Medusa cart identifier |

---

## Implementation Priority

1. **`view_item`** — Lowest risk, highest volume. Instrument product pages first.
2. **`add_to_cart`** — Fire after Medusa API confirmation in cart actions.
3. **`begin_checkout`** — Fire on `CheckoutForm.tsx` mount.
4. **`purchase`** (client) — Fire on order confirmation page.
5. **`purchase`** (server) — Requires Measurement Protocol setup + Medusa event integration.

---

## Testing & Validation

1. **GA4 DebugView** — Enable debug mode via GTM preview or `gtag('config', 'G-NQ94Z6HWGV', { debug_mode: true })`
2. **GTM Preview Mode** — Verify dataLayer pushes and tag firings
3. **Measurement Protocol Validation** — Use `/mp/collect?validation_hit=1` endpoint for server-side events
4. **Real-time Report** — Verify events appear in GA4 real-time view
5. **Revenue Reconciliation** — Compare GA4 purchase revenue vs Stripe Dashboard vs Medusa orders for 7-day period
