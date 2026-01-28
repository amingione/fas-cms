# Shipping Integration Documentation

**EasyPost + Stripe Adaptive Pricing**
Real-time dynamic shipping rates in Stripe Checkout

Last Updated: January 21, 2026
Version: 1.0.0
Status: ✅ Ready for Testing

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Setup Instructions](#setup-instructions)
3. [Environment Configuration](#environment-configuration)
4. [API Endpoints Reference](#api-endpoints-reference)
5. [Webhook Handlers](#webhook-handlers)
6. [Label Creation Flow](#label-creation-flow)
7. [Testing & Debugging](#testing--debugging)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [FAQ](#faq)

---

## Architecture Overview

### How It Works

```
User enters address in Stripe Checkout
         ↓
Stripe calls YOUR webhook endpoint
         ↓
Webhook calls EasyPost API for rates
         ↓
Returns rates to Stripe in real-time
         ↓
User sees live UPS/USPS/FedEx rates
         ↓
User selects rate and completes payment
         ↓
Webhook creates EasyPost label post-purchase
```

### Components Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     STRIPE CHECKOUT UI                       │
│  User enters shipping address                                │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
        ┌───────────────────────────────────────┐
        │   Stripe Adaptive Pricing Webhook     │
        │   stripe.com → your-site.com/webhook  │
        └───────────────┬───────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────────────────┐
│              fas-cms-fresh                                 │
│  /api/stripe/shipping-rates-webhook                        │
│  - Receives address from Stripe                            │
│  - Validates session_id                                    │
│  - Calls EasyPost API for rate calculation                 │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
            ┌────────────────────┐
            │   EasyPost API     │
            │  - Creates shipment │
            │  - Returns rates    │
            └────────┬───────────┘
                     │
                     ▼
            Rates → Stripe → User
```

---

## Setup Instructions

### 1. Stripe Dashboard Configuration

1. Navigate to: **Settings → Payments → Checkout**
2. Find: **"Dynamic shipping rates"** section
3. Enable: **"Calculate shipping rates dynamically"**
4. Configure webhook endpoint URL:
   ```
   https://fasmotorsports.com/api/stripe/shipping-rates-webhook
   ```
5. Copy the webhook signing secret (provided by Stripe Dashboard)

### 2. Environment Variables Setup

#### fas-cms-fresh (.env)

Add these variables to your `.env` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live...
STRIPE_PUBLISHABLE_KEY=pk_live...
STRIPE_SHIPPING_WEBHOOK_SECRET=YOUR_STRIPE_SHIPPING_WEBHOOK_SECRET

# EasyPost Integration (Checkout Rates)
EASYPOST_API_KEY=EZAK_...
EASYPOST_API_BASE=https://api.easypost.com
WAREHOUSE_ADDRESS_LINE1=6161 Riverside Dr
WAREHOUSE_ADDRESS_LINE2=
WAREHOUSE_CITY=Punta Gorda
WAREHOUSE_STATE=FL
WAREHOUSE_ZIP=33982
WAREHOUSE_PHONE=812-200-9012
WAREHOUSE_EMAIL=orders@updates.fasmotorsports.com
```

#### fas-sanity (.env) (Labels & Tracking Only)

Ensure you have:

```bash
# EasyPost Configuration
EASYPOST_API_KEY=EZAK...
EASYPOST_MODE=production  # or 'test' for sandbox

# Warehouse Address
SHIP_FROM_NAME=FAS Motorsports
SHIP_FROM_STREET1=123 Warehouse St
SHIP_FROM_CITY=Austin
SHIP_FROM_STATE=TX
SHIP_FROM_ZIP=78701
SHIP_FROM_COUNTRY=US
SHIP_FROM_PHONE=555-123-4567
```

---

## Environment Configuration

### Required Variables

| Variable | Repository | Purpose |
|----------|------------|---------|
| `STRIPE_SECRET_KEY` | fas-cms-fresh | Stripe API authentication |
| `STRIPE_SHIPPING_WEBHOOK_SECRET` | fas-cms-fresh | Verify webhook signatures |
| `EASYPOST_API_KEY` | fas-cms-fresh | EasyPost API authentication for checkout rates |
| `EASYPOST_API_BASE` | fas-cms-fresh | EasyPost API base URL |
| `WAREHOUSE_*` | fas-cms-fresh | Warehouse shipping address for checkout rates |
| `EASYPOST_API_KEY` | fas-sanity | EasyPost API authentication for labels |
| `SHIP_FROM_*` | fas-sanity | Warehouse shipping address for labels |

### Optional Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `DEFAULT_PACKAGE_WEIGHT_LBS` | 5 | Fallback weight if product missing |
| `EASYPOST_MODE` | production | Use 'test' for sandbox testing |

---

## API Endpoints Reference

### Shipping Rates Webhook

**Endpoint:** `POST /api/stripe/shipping-rates-webhook`

**Called by:** Stripe Adaptive Pricing

**Purpose:** Calculate and return real-time shipping rates

**Request (from Stripe):**
```json
{
  "shipping_address": {
    "line1": "123 Main St",
    "city": "Austin",
    "state": "TX",
    "postal_code": "78701",
    "country": "US"
  },
  "session_id": "cs_test_abc123"
}
```

**Response (to Stripe):**
```json
{
  "shipping_rates": [
    {
      "id": "dyn_<easypostRateId>",
      "display_name": "USPS Priority",
      "delivery_estimate": {
        "minimum": { "unit": "business_day", "value": 2 },
        "maximum": { "unit": "business_day", "value": 3 }
      },
      "fixed_amount": {
        "amount": 1250,
        "currency": "usd"
      },
      "metadata": {
        "easypost_rate_id": "<easypostRateId>",
        "easypost_shipment_id": "shp_xyz789",
        "carrier": "USPS",
        "service": "Priority",
        "carrier_id": "ca_123",
        "service_code": "Priority"
      }
    }
  ]
}
```

### Checkout Session Creation

**Endpoint:** `POST /api/stripe/create-checkout-session`

**Purpose:** Create Stripe Checkout with cart metadata

**Key Changes:**
- Cart items added to session metadata for webhook access
- `shipping_address_collection` enabled
- NO static `shipping_options` (Adaptive Pricing handles this)

### Order Webhook

**Endpoint:** `POST /api/webhooks/stripe-order`

**Purpose:** Create order in Sanity after successful payment

**Key Changes:**
- Extracts EasyPost metadata from `shipping_cost.shipping_rate.metadata`
- Stores `easypostShipmentId`, `easypostRateId`, `carrierId`, `serviceCode`
- Used later for label creation

---

## Webhook Handlers

### 1. shipping-rates-webhook.ts

**Location:** `fas-cms-fresh/src/pages/api/stripe/shipping-rates-webhook.ts`

**Flow:**
1. Verify Stripe signature
2. Extract shipping address and session ID
3. Retrieve session line items for shipping metadata
4. Call EasyPost API to calculate rates
5. Transform EasyPost rates to Stripe format
6. Return rates to Stripe

**Error Handling:**
- 401: Invalid signature
- 400: Missing required data
- 500: EasyPost API failure

### 2. stripe-order webhook

**Location:** `fas-sanity/src/pages/api/webhooks/stripe-order.ts`

**Flow:**
1. Receive `checkout.session.completed` event
2. Extract shipping metadata from session
3. Create order document in Sanity
4. Store EasyPost IDs for label creation

---

## Label Creation Flow

### Post-Purchase Label Creation

**When:** After order is created in Sanity

**How:** Manual trigger from Sanity Studio only

**Process:**

1. **Retrieve Order from Sanity**
   ```typescript
   const order = await sanity.fetch(`*[_type == "order" && _id == $orderId][0]`, { orderId });
   ```

2. **Use Stored Metadata**
   ```typescript
   // Current: Creates new shipment
   // Future: Reuse stored shipment
   const shipment = await easyPost.Shipment.retrieve(order.easypostShipmentId);
   const selectedRate = shipment.rates.find(r => r.id === order.easypostRateId);
   ```

3. **Purchase Label**
   ```typescript
   const label = await shipment.buy(selectedRate);
   ```

4. **Update Order**
   ```typescript
   await sanity.patch(orderId).set({
     'shipping.labelUrl': label.postage_label.label_url,
     'shipping.trackingCode': label.tracking_code,
     'shipping.trackingUrl': label.tracker?.public_url
   }).commit();
   ```

---

## Testing & Debugging

### Test Checklist

#### 1. Webhook Configuration
- [ ] Webhook endpoint is accessible publicly
- [ ] Webhook secret is correctly configured
- [ ] EasyPost API key configured in fas-cms-fresh

#### 2. Test Checkout Flow
```bash
# 1. Create test checkout session
curl -X POST https://fasmotorsports.com/api/stripe/create-checkout-session \
  -H "Content-Type: application/json" \
  -d '{
    "cart": [{"sku": "TEST-SKU", "quantity": 1, "priceId": "price_xxx"}],
    "mode": "payment"
  }'

# 2. Open checkout URL in browser
# 3. Enter test shipping address (use Stripe test mode)
# 4. Verify rates appear dynamically
# 5. Complete test payment
# 6. Verify order in Sanity
```

#### 3. Verify Rate Calculation
- [ ] Rates appear when address is entered
- [ ] Multiple carrier options shown (USPS, UPS, FedEx)
- [ ] Delivery estimates display correctly
- [ ] Prices are in dollars (not cents)

#### 4. Verify Order Creation
- [ ] Order created in Sanity with correct data
- [ ] EasyPost metadata stored (`easypostShipmentId`, `easypostRateId`)
- [ ] Shipping address populated
- [ ] Customer details correct

### Debug Logging

**Check logs for:**

```bash
# fas-cms-fresh
[checkout] Using Stripe Checkout with EasyPost for dynamic shipping rates

# Webhook logs
Shipping rates webhook error: [error details]
# EasyPost shipment created: shp_xyz
```

---

## Troubleshooting Guide

### No rates appearing in checkout

**Check:**
1. Webhook endpoint is publicly accessible
2. Webhook secret matches Stripe Dashboard
3. EasyPost API key is correct
4. Products have weight/dimensions in Stripe metadata
5. EasyPost API status is healthy

**Debug:**
```bash
# Test webhook directly
curl -X POST https://fasmotorsports.com/api/stripe/shipping-rates-webhook \
  -H "Content-Type: application/json" \
  -H "stripe-signature: [test-sig]" \
  -d '{"shipping_address": {...}, "session_id": "test"}'
```

### Wrong rates showing

**Common causes:**
- Incorrect product weights in Sanity
- Missing dimensions
- Wrong warehouse address in SHIP_FROM_* variables
- EasyPost in test mode vs production

**Fix:**
1. Verify product shipping data in Sanity Studio
2. Check SHIP_FROM_* environment variables
3. Ensure EASYPOST_MODE matches environment

### Webhook signature verification fails

**Fix:**
1. Verify STRIPE_SHIPPING_WEBHOOK_SECRET matches Stripe Dashboard
2. Check webhook endpoint is receiving raw body (not parsed JSON)
3. Ensure no middleware is modifying request body

### Label creation fails

**Common causes:**
- Missing order data
- Invalid EasyPost shipment ID
- Address validation errors

**Fix:**
1. Verify order has complete shipping address
2. Check EasyPost dashboard for shipment status
3. Review address format (street1, city, state, zip required)

---

## FAQ

### Q: Why use EasyPost?

**A:** EasyPost provides:
- Full API access for custom logic
- Multiple carrier support (USPS, UPS, FedEx, DHL, etc.)
- Real-time rate calculation
- Complete control over shipping flow
- Label creation API
- Tracking integration

### Q: Do rates update in real-time as the user types?

**A:** Yes! Stripe's Adaptive Pricing calls your webhook every time the user updates their shipping address, providing instant rate updates.

### Q: What happens if EasyPost is down?

**A:** The webhook will return an error and Stripe won't show shipping rates. Consider implementing:
- Fallback to static rates
- Rate caching for common routes
- Error messaging to customer

### Q: Can I customize which carriers are shown?

**A:** Yes! Filter carriers in `shipping-rates-webhook.ts` after the EasyPost response:
```typescript
const rates = rateData.rates.filter(rate =>
  ['USPS', 'UPS'].includes(rate.carrier)
);
```

### Q: How do I add free shipping for orders over $100?

**A:** Modify the webhook to check cart total:
```typescript
if (cartTotal >= 100) {
  return {
    shipping_rates: [{
      id: 'free_shipping',
      display_name: 'Free Shipping',
      fixed_amount: { amount: 0, currency: 'usd' }
    }]
  };
}
```

### Q: Can I test without deploying?

**A:** Use Stripe CLI to forward webhooks to localhost:
```bash
stripe listen --forward-to localhost:3000/api/stripe/shipping-rates-webhook
```

### Q: What about international shipping?

**A:** Phase 1 hard-locks `allowed_countries` to US:
```typescript
shipping_address_collection: {
  allowed_countries: ['US']
}
```

---

## Next Steps for Production

### Before Going Live

1. **Test thoroughly in Stripe test mode**
   - Try various addresses (residential, commercial, PO boxes)
   - Test with different product combinations
   - Verify international addresses if enabled

2. **Monitor error rates**
   - Set up error tracking (Sentry, LogRocket, etc.)
   - Create alerts for webhook failures
   - Monitor EasyPost API quotas

3. **Performance optimization**
   - Cache common routes (if applicable)
   - Optimize product queries
   - Consider rate limiting

4. **Documentation**
   - Train support team on shipping process
   - Document common issues and fixes
   - Create runbook for emergencies

### Post-Launch Monitoring

**Metrics to track:**
- Webhook response time (target: <2s)
- Rate calculation success rate (target: >99%)
- Label creation success rate (target: >99.5%)
- Shipping cost accuracy vs actual carrier costs

---

## Support & Resources

### Getting Help
- **EasyPost Support**: support@easypost.com
- **Stripe Support**: https://support.stripe.com
- **Documentation**: This file and inline code comments

### Useful Resources
- [Stripe Adaptive Pricing Docs](https://stripe.com/docs/payments/checkout/shipping)
- [EasyPost API Reference](https://www.easypost.com/docs/api)
- [Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices)

---

**🎯 End Goal**: Customers see real-time UPS/USPS/FedEx rates inside Stripe Checkout based on their exact shipping address, with automatic label creation after purchase using EasyPost.

**💰 Business Value**: Accurate shipping costs, reduced manual work, better customer experience, support for growth and international expansion.
