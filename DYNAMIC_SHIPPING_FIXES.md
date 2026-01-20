# Dynamic Shipping Options - Fixes Applied

## Files Modified

### 1. `/src/pages/api/stripe/create-checkout-session.ts`

**Fixed:** Added required initial placeholder shipping option for dynamic shipping

```typescript
...(shippingRequired
  ? {
      permissions: {
        update_shipping_details: 'server_only' as const
      },
      // CRITICAL: Must provide initial placeholder shipping option for dynamic shipping
      shipping_options: [
        {
          shipping_rate_data: {
            display_name: 'Calculating shipping...',
            type: 'fixed_amount',
            fixed_amount: {
              amount: 0,
              currency: 'usd'
            }
          }
        }
      ]
    }
  : {}),
```

**Why:** Stripe requires an initial `shipping_options` array when using `permissions.update_shipping_details: 'server_only'`. Without this, the checkout form won't show any shipping options section.

**Enhanced:** Added detailed Parcelcraft metadata logging to verify all required fields are present:

- `shipping_required`
- `package_weight`
- `package_weight_unit`
- `package_length`
- `package_width`
- `package_height`
- `dimensions_unit` ⬅️ **This was missing from logs**
- `origin_country`
- `customs_description`
- `tariff_code`

### 2. `/src/pages/api/stripe/update-shipping-options.ts`

**Fixed:** Simplified the endpoint to properly support Parcelcraft's automatic rate injection

**Removed:** Session update logic that was interfering with Parcelcraft

**Added:** Detailed logging to verify:

- Session configuration
- Product metadata on each line item
- Whether all required Parcelcraft fields are present

**Why:** Parcelcraft automatically injects shipping rates when it detects the proper configuration. Manually updating the session can interfere with this process.

## How Parcelcraft Dynamic Shipping Works

### Requirements Checklist ✅

1. **Embedded Checkout Configuration:**
   - ✅ `ui_mode: 'embedded'`
   - ✅ `permissions.update_shipping_details: 'server_only'`
   - ✅ `shipping_address_collection` enabled
   - ✅ `invoice_creation.enabled: true`
   - ✅ Initial `shipping_options` array provided

2. **Product Metadata (all required):**
   - ✅ `shipping_required: 'true'`
   - ✅ `package_weight: '[number]'`
   - ✅ `package_weight_unit: 'pound'`
   - ✅ `package_length: '[number]'`
   - ✅ `package_width: '[number]'`
   - ✅ `package_height: '[number]'`
   - ✅ `dimensions_unit: 'inch'`
   - ✅ `origin_country: 'US'`

3. **Stripe Product Configuration:**
   - ✅ `type: 'good'`
   - ✅ `shippable: true`
   - ✅ `package_dimensions` object (optional but recommended)

### Flow

1. Customer lands on `/checkout` page
2. `EmbeddedCheckout` component creates checkout session
3. Checkout session is created with:
   - Line items (products with Parcelcraft metadata)
   - Embedded UI mode
   - Dynamic shipping permissions
   - Initial placeholder shipping option
4. Customer enters shipping address in embedded form
5. `onShippingDetailsChange` callback fires
6. Client calls `/api/stripe/update-shipping-options`
7. **Parcelcraft detects the address change and:**
   - Reads product metadata from line items
   - Calculates shipping rates from configured carriers
   - Injects carrier rates (`ca_*` IDs) into the session
   - Customer sees real shipping options

## Common Issues & Troubleshooting

### Issue 1: Only seeing `shr_*` IDs (static rates) instead of `ca_*` IDs (carrier rates)

**Cause:** Parcelcraft is not injecting dynamic rates

**Solutions:**

1. Verify Parcelcraft app is installed in Stripe Dashboard:
   - Go to: https://dashboard.stripe.com/apps
   - Verify "Parcelcraft" shows "Installed"

2. Check Parcelcraft configuration:
   - Go to: https://dashboard.stripe.com/apps/parcelcraft/settings
   - Verify shipping carriers (UPS, USPS, FedEx) are configured
   - Verify API credentials are valid

3. Check product metadata in logs:
   - Look for `[checkout] Created shippable product for Parcelcraft:`
   - Verify all required fields are present (especially `dimensions_unit`)

4. Check for static shipping rates:
   - Run: `tsx scripts/parcelcraft-diagnostic.ts`
   - If static rates exist, delete them (they override Parcelcraft)

### Issue 2: `dimensions_unit` not appearing in Stripe metadata

**Status:** ✅ FIXED - Field is being set in `buildParcelcraftProductMetadata()`

**Verification:** Check logs for the new detailed metadata output showing all Parcelcraft fields

### Issue 3: Shipping options never appear in checkout form

**Causes:**

- Missing initial `shipping_options` array ✅ FIXED
- Missing `permissions.update_shipping_details` ✅ Already set
- Missing `shipping_address_collection` ✅ Already set
- Missing `invoice_creation.enabled: true` ✅ Already set

## Testing Steps

1. **Start dev server:**

   ```bash
   yarn dev
   ```

2. **Add products to cart and go to checkout**

3. **Watch server logs for:**

   ```
   [checkout] Created shippable product for Parcelcraft:
   ```

   Verify `dimensions_unit: 'inch'` is present

4. **Enter shipping address in checkout form**

5. **Watch for:**

   ```
   [update-shipping-options] Address change received:
   [update-shipping-options] Product metadata check:
   ```

6. **Verify carrier rates appear:**
   - Should see actual carrier names (UPS, FedEx, USPS)
   - Should see realistic prices (not $0.00)
   - Rate IDs should start with `ca_` not `shr_`

7. **Complete checkout and check webhook:**
   ```
   [webhook] checkout.session.completed
   ```
   Look for `shipping_rate` with `ca_` prefix

## Next Steps

If shipping rates still don't appear after these fixes:

1. **Run diagnostic script:**

   ```bash
   npm run tsx scripts/parcelcraft-diagnostic.ts
   ```

2. **Check Stripe Dashboard:**
   - Go to Products → [Your Product]
   - Click on a recent product created during checkout
   - Verify metadata includes all required Parcelcraft fields
   - Verify `package_dimensions` is set

3. **Check Parcelcraft logs in Stripe:**
   - Go to: https://dashboard.stripe.com/apps/parcelcraft
   - Look for recent activity/errors

4. **Contact Parcelcraft support** if issue persists:
   - Provide session ID
   - Provide product metadata screenshot
   - Describe the issue
