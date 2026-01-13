# Fix: UPS Ground Always Shows "1 Day" Delivery Estimate

## Problem
When creating a checkout in Stripe Dashboard with Parcelcraft dynamic rates, UPS Ground shipping always shows "1 day" delivery estimate regardless of the destination location.

## Root Cause
This is a **Parcelcraft configuration issue**, not a code issue. Your code correctly reads delivery estimates from Parcelcraft/Stripe metadata - it doesn't set them. Parcelcraft is either:
1. Not querying UPS transit times properly
2. Using a default/fallback value of 1 day
3. Not configured to use UPS's Time-in-Transit API

## Solution: Configure Parcelcraft Transit Times

### Step 1: Access Parcelcraft Settings in Stripe
1. Go to **Stripe Dashboard** → **Apps** → **Parcelcraft**
2. Click on **Settings** or **Configuration**

### Step 2: Check UPS Integration Settings
Look for settings related to:
- **UPS Time-in-Transit API** - Should be enabled
- **Transit Time Calculation** - Should use UPS's actual transit time data
- **Default Transit Times** - Should NOT be hardcoded to 1 day

### Step 3: Verify UPS Service Configuration
In Parcelcraft settings, check the **UPS Ground** service configuration:
- **Transit Time Source**: Should be "UPS API" or "Dynamic" (not "Fixed" or "Default")
- **Minimum Transit Days**: Should be empty or set to actual minimum (typically 1-2 days)
- **Maximum Transit Days**: Should be empty or set to actual maximum (typically 5-8 days for Ground)

### Step 4: Test with Different Addresses
After updating settings:
1. Create a test checkout in Stripe Dashboard
2. Try different shipping addresses:
   - **Local address** (same state): Should show 1-2 days
   - **Cross-country** (e.g., CA to NY): Should show 4-7 days
   - **International** (if applicable): Should show longer transit times

### Step 5: Check Parcelcraft Logs/Dashboard
If Parcelcraft has a dashboard or logs:
- Check if UPS API calls are being made for transit times
- Look for any errors in transit time calculation
- Verify UPS account has access to Time-in-Transit API

## Alternative: Contact Parcelcraft Support

If you cannot find these settings or they don't exist:

1. **Contact Parcelcraft Support**:
   - Email: support@parcelcraft.com (or check their website)
   - Explain: "UPS Ground shipping always shows 1 day transit time regardless of destination"
   - Request: Enable dynamic transit time calculation using UPS Time-in-Transit API

2. **Provide Details**:
   - Your Stripe account ID
   - UPS account number (if they need it)
   - Examples of incorrect transit times you're seeing

## Verification: How to Check What Parcelcraft is Sending

### Method 1: Check Stripe Checkout Session
After creating a test checkout, retrieve the session:

```bash
# Using Stripe CLI
stripe checkout sessions retrieve cs_test_xxxxx

# Or via API
curl https://api.stripe.com/v1/checkout/sessions/cs_test_xxxxx \
  -u sk_test_xxxxx:
```

Look at:
- `shipping_cost.shipping_rate.delivery_estimate` - Should have `minimum` and `maximum` days
- `shipping_cost.shipping_rate.metadata` - May contain transit time info

### Method 2: Check Your Webhook Logs
After a test checkout, check your webhook handler logs for:
- `shipping_delivery_days` in session metadata
- `shipping_estimated_delivery_date` in session metadata

These values come from Parcelcraft, so if they're always "1", Parcelcraft is sending incorrect data.

## Expected Behavior

**UPS Ground transit times should vary by distance:**
- **Same city/state**: 1-2 business days
- **Adjacent states**: 2-3 business days  
- **Cross-country**: 4-7 business days
- **Remote areas**: 5-8 business days

## Code Status

✅ **Your code is correct** - It reads delivery estimates from Parcelcraft/Stripe:
- `src/pages/api/webhooks.ts` reads `shipping_delivery_days` and `shipping_estimated_delivery_date` from session metadata
- No hardcoded transit times in your code
- Code will automatically use correct transit times once Parcelcraft is configured properly

## Next Steps

1. ✅ Check Parcelcraft settings in Stripe Dashboard
2. ✅ Verify UPS Time-in-Transit API is enabled
3. ✅ Test with multiple addresses to confirm transit times vary
4. ✅ Contact Parcelcraft support if settings don't exist or don't work
5. ✅ Verify transit times are correct in production after fix
