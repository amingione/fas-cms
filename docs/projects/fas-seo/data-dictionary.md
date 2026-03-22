# Data Dictionary

## Sanity Schemas

Source: `sanity/schemas/`

### vendor.ts
Vendor profile with portal access and business details.

| Field | Type | Description |
|-------|------|-------------|
| name | string | Vendor business name |
| slug | slug | URL-friendly identifier |
| email | string | Contact email |
| permissions | array | Portal access permissions |
| tier | string | Vendor tier level |
| authTokens | reference[] | References to `vendorAuthToken` |
| shippingAddresses | object[] | Vendor shipping addresses |
| notificationPreferences | object | Notification settings |

### quoteRequest.ts
Quote requests from build configurator and wheel quotes.

| Field | Type | Description |
|-------|------|-------------|
| customerName | string | Requestor name |
| email | string | Contact email |
| vehicle | object | Vehicle details (make, model, year) |
| requestType | string | Type: build configurator, Belak wheels, JTX wheels |
| status | string | Enum: `new`, `in-progress`, `quoted`, `won`, `lost` |
| notes | text | Internal notes |

### customer.ts
Basic customer record.

| Field | Type | Description |
|-------|------|-------------|
| name | string | Customer full name |
| email | string | Email address |
| phone | string | Phone number |
| notes | text | Internal notes |
| address | object | Mailing address |

**Gap for Phase 2:** No vehicle profile fields (platform, currentMods, targetHP, buildStage).

### brandMention.ts
Read-only mirror of brand mentions from Firehose monitoring service.

| Field | Type | Description |
|-------|------|-------------|
| source | string | Where the mention was found |
| content | text | Mention content |
| url | url | Source URL |
| sentiment | string | Sentiment analysis result |
| timestamp | datetime | When detected |

### emailCampaign.ts
Email campaign tracking records.

### marketingOptIn.ts
Customer marketing preference tracking.

### vendorAuthToken.ts
Vendor authentication token management.

### vendorDocument.ts
Document storage/references for vendor portal.

### vendorMessage.ts
Vendor messaging (vendor-to-vendor or admin).

### vendorNotification.ts
Notification records for vendor portal.

### vendorReturn.ts
Vendor product returns/RMA tracking.

---

## Medusa Entities (via API)

Source: BFF routes in `src/pages/api/`

**Note:** Medusa schema details are authoritative in the fas-medusa repo. Below are entities as observed from fas-cms API consumption.

### Cart
- **Create:** `POST /store/carts` → returns `cart` with `id`, `items[]`, `region_id`
- **Add item:** `POST /store/carts/{id}/line-items` → body: `{ variant_id, quantity }`
- **Update address:** `POST /store/carts/{id}` → body: `{ shipping_address, billing_address }`
- **Shipping options:** `GET /store/shipping-options?cart_id={id}`
- **Select shipping:** `POST /store/carts/{id}/shipping-methods` → body: `{ option_id }`
- **Discount code:** `POST /store/carts/{id}/discounts` → body: `{ code }`

### PaymentIntent
- **Create:** `POST /store/payment-intents` → body: `{ cart_id }`
- **Response:** `{ client_secret, publishable_key }`

### Order
- **Get by ID:** `GET /store/orders/{id}`
- **Get by PaymentIntent:** Custom lookup via `payment_intent` parameter
- **Complete:** Orchestrated via `/api/complete-order` (Medusa + Sanity write)

### Product
- **List:** `GET /store/products` with `x-publishable-api-key` header
- **Includes:** `id`, `title`, `handle`, `variants[]`, `images[]`, `metadata`

### Customer (Medusa)
- **NEEDS CONFIRMATION:** Exact Medusa customer fields and metadata capabilities
- Expected: `id`, `email`, `first_name`, `last_name`, `metadata` (extensible)

---

## API Contracts (fas-cms BFF)

### POST /api/medusa/payments/create-intent

```typescript
// Request
{ cart_id: string }

// Response (proxied from Medusa)
{ client_secret: string, publishable_key: string }
```

### POST /api/medusa/cart/add-item

```typescript
// Request
{ cart_id: string, variant_id: string, quantity: number }

// Response
{ cart: MedusaCart }
```

### POST /api/medusa/cart/shipping-options

```typescript
// Request
{ cart_id: string }

// Response (via Shippo)
{ shipping_options: ShippingOption[] }
```

### POST /api/complete-order

```typescript
// Request
{ cart_id: string, payment_intent_id: string }

// Response
{ order: MedusaOrder }
// Side effect: writes order record to Sanity
```

### GET /api/cart/[id]

```typescript
// Response
{ cart: MedusaCart }
```

### GET /api/orders/[id]

```typescript
// Response
{ order: MedusaOrder }
```

---

## Event Names (Current)

### Client-Side (gtag.js)

| Event | Status | Source |
|-------|--------|--------|
| `page_view` | Active (default) | `src/layouts/BaseLayout.astro` |
| `view_item` | NOT implemented | — |
| `add_to_cart` | NOT implemented | — |
| `begin_checkout` | NOT implemented | — |
| `purchase` | NOT implemented | — |

### Server-Side

| Event | Status | Source |
|-------|--------|--------|
| Medusa order events | NEEDS CONFIRMATION | fas-medusa repo |
| Stripe `payment_intent.succeeded` | Active → fas-medusa | Stripe webhook config |

---

## Environment Variables (Analytics-Related)

| Variable | Purpose | Default |
|----------|---------|---------|
| `PUBLIC_GA_MEASUREMENT_ID` | GA4 property ID | `G-NQ94Z6HWGV` |
| `PUBLIC_GA_ID` | GA ID (alternate) | — |
| `PUBLIC_GOOGLE_ADS_ID` | Google Ads conversion ID | `AW-17641771829` |
| `GOOGLE_ANALYTICS_PROPERTY_ID` | GA4 property for server-side reads | — |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service account for GA4 API | — |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Service account key (JSON) | — |
