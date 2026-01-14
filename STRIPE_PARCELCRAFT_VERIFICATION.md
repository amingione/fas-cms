# Stripe + Parcelcraft Configuration Verification Checklist

## ✅ Code Configuration Status

Based on your codebase, here's what I can verify:

### Environment Variables ✅
- ✅ `STRIPE_USE_DYNAMIC_SHIPPING_RATES=true` - **SET CORRECTLY**
- ✅ `SHIPPING_PROVIDER=parcelcraft` - **SET CORRECTLY**
- ✅ Static Stripe shipping rates are forbidden

### Code Implementation ✅
- ✅ `create-checkout-session.ts` defaults to dynamic shipping when env var is unset
- ✅ Checkout never sets `shipping_options` (Parcelcraft supplies dynamic rates)
- ✅ Shipping address collection is enabled: `shipping_address_collection` with `allowed_countries`
- ✅ Automatic tax is enabled: `automatic_tax: { enabled: true }`
- ✅ Webhook handler (`webhooks.ts`) already reads Parcelcraft metadata from PaymentIntent and Checkout Session

---

## ⚠️ Stripe Dashboard Configuration (Manual Verification Required)

Since I cannot access your Stripe Dashboard directly, please verify the following:

### 1. Parcelcraft App Installation
**Location:** Stripe Dashboard → Apps → Installed Apps

- [ ] **Parcelcraft app is installed** in your Stripe account
- [ ] **App status shows "Active"** or "Connected"
- [ ] If not installed, go to Stripe Dashboard → Apps → Browse Apps → Search "Parcelcraft" → Install

### 2. UPS Account Connection
**Location:** Stripe Dashboard → Apps → Parcelcraft → Settings

- [ ] **UPS account is connected** to Parcelcraft
- [ ] **UPS credentials are valid** (account number, API keys, etc.)
- [ ] **Test connection** works (if Parcelcraft provides a test button)

### 3. Dynamic Shipping Rates Configuration
**Location:** Stripe Dashboard → Settings → Payments → Checkout → Shipping

- [ ] **"Calculate shipping rates dynamically"** is enabled
- [ ] **Parcelcraft** is selected as the shipping rate provider
- [ ] **UPS services** are configured (e.g., Ground, 2nd Day Air, Next Day Air)
- [ ] **Markups/price adjustments** are set if needed
- [ ] **Default package settings** (weight, dimensions) match your Sanity product shipping config

### 4. Checkout Session Settings
**Location:** Stripe Dashboard → Settings → Payments → Checkout

- [ ] **Shipping address collection** is enabled (should match your code: `shipping_address_collection`)
- [ ] **Billing address collection** is set to "Required" (matches your code)
- [ ] **Automatic tax** is enabled (matches your `automatic_tax: { enabled: true }`)

### 5. Test Checkout Flow
**How to test:**

1. Create a test Checkout Session via your API:
   ```bash
   curl -X POST https://your-domain.com/api/stripe/create-checkout-session \
     -H "Content-Type: application/json" \
     -d '{"cart": [{"id": "test-product", "name": "Test", "price": 100, "quantity": 1}]}'
   ```

2. Open the returned `url` in a browser

3. **Verify:**
   - [ ] After entering shipping address, **UPS shipping options appear** (Ground, 2nd Day, etc.)
   - [ ] **Prices are calculated dynamically** (not flat rates)
   - [ ] **Multiple UPS services** are shown (if configured)
   - [ ] **Delivery estimates** are displayed (if Parcelcraft provides them)

4. Complete a test payment and check:
   - [ ] **Webhook receives** `checkout.session.completed` event
   - [ ] **Order document** in Sanity contains:
     - `carrier`: "UPS" or similar
     - `service`: UPS service name (e.g., "Ground", "2nd Day Air")
     - `shippingQuoteId`: Parcelcraft quote ID
     - `amountShipping`: Correct shipping amount

---

## 🔍 How to Verify Parcelcraft is Working

### Method 1: Check Stripe Checkout Session (After Test Payment)
```bash
# Using Stripe CLI (if installed)
stripe checkout sessions retrieve cs_test_xxxxx

# Or via API
curl https://api.stripe.com/v1/checkout/sessions/cs_test_xxxxx \
  -u sk_test_xxxxx:
```

Look for:
- `shipping_cost.shipping_rate` - Should have Parcelcraft-generated rate
- `shipping_cost.shipping_rate.metadata` - Should contain Parcelcraft fields:
  - `shipping_carrier`: "UPS"
  - `shipping_service`: Service name
  - `shipping_quote_id`: Parcelcraft quote ID

### Method 2: Check Your Webhook Logs
After a test checkout, check your webhook handler logs for:
- `checkout.session.completed` event received
- Order document created with Parcelcraft metadata
- Shipping metadata extracted correctly

### Method 3: Check Parcelcraft Dashboard (if available)
- Log into Parcelcraft dashboard
- Verify test shipments/quotes appear
- Check UPS connection status

---

## 🚨 Common Issues & Solutions

### Issue: No shipping options appear in Checkout
**Possible causes:**
1. Parcelcraft app not installed → Install from Stripe Apps
2. UPS not connected → Connect UPS account in Parcelcraft settings
3. Dynamic shipping not enabled → Enable in Stripe Checkout settings
4. Address not collected early enough → Ensure `shipping_address_collection` is set

**Solution:** Verify all checklist items above

### Issue: Shipping rates are $0 or incorrect
**Possible causes:**
1. UPS account not connected properly
2. Package dimensions/weight not passed correctly
3. Parcelcraft configuration issue

**Solution:** Check Parcelcraft logs, verify UPS connection, test with known address

### Issue: Only one shipping option appears
**Possible causes:**
1. Only one UPS service configured in Parcelcraft
2. Other services filtered out by Parcelcraft rules

**Solution:** Check Parcelcraft settings for available UPS services

---

## 📝 Next Steps

1. **Complete the checklist above** - Verify each item in Stripe Dashboard
2. **Run a test checkout** - Use test mode to verify end-to-end flow
3. **Check webhook logs** - Ensure Parcelcraft metadata is captured correctly
4. **Monitor first real orders** - Watch for any issues in production

---

## ✅ Summary

**Code Status:** ✅ **CORRECTLY CONFIGURED**
- Dynamic shipping enabled via environment variable
- Code properly defers to Stripe/Parcelcraft for rate calculation
- Webhook handlers ready to consume Parcelcraft metadata

**Stripe Dashboard:** ⚠️ **REQUIRES MANUAL VERIFICATION**
- Cannot verify Parcelcraft installation via API
- Cannot verify UPS connection via API
- Cannot verify Checkout settings via API

**Action Required:** Please verify all items in the "Stripe Dashboard Configuration" section above.
