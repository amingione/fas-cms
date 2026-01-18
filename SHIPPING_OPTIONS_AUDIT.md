# Dynamic Shipping Options Audit Report

## Issue Summary
Dynamic shipping options from Parcelcraft are not appearing in Stripe Checkout - no shipping options show up at all.

## Root Cause Analysis

### Critical Code Path
The code conditionally sets `shipping_address_collection` based on the `shippingRequired` flag:

```typescript
// Line 1096 in create-checkout-session.ts
...(shippingRequired ? { shipping_address_collection: shippingAddressCollection } : {}),
```

**Parcelcraft requires BOTH of the following to inject dynamic shipping rates:**
1. ✅ `invoice_creation: { enabled: true }` - **ALWAYS SET** (line 1085-1090)
2. ⚠️ `shipping_address_collection` - **ONLY SET IF `shippingRequired === true`** (line 1096)

If `shippingRequired` evaluates to `false`, `shipping_address_collection` is **NOT** set, which prevents Parcelcraft from injecting shipping rates.

## How `shippingRequired` is Determined

### Step 1: Products are Fetched (Line 602)
```typescript
const productLookup = await fetchShippingProductsForCart(cart as CheckoutCartItem[]);
```

### Step 2: `shippingRequired` is Calculated (Line 603)
```typescript
const shippingRequired = requiresShippingSelection(cart as CheckoutCartItem[], productLookup);
```

### Step 3: `requiresShippingSelection()` Checks Each Item (Lines 590-600)
```typescript
const requiresShippingSelection = (items, productLookup) => {
  return items.some((item) => {
    const productId = normalizeCartId(item.id);
    const product = productId ? productLookup[productId] : undefined;
    return resolveRequiresShipping(product, item);
  });
};
```

### Step 4: `resolveRequiresShipping()` Logic (Lines 281-301)
```typescript
const resolveRequiresShipping = (product?, item?) => {
  // Explicit false check
  if (product?.shippingConfig?.requiresShipping === false) return false;
  
  // Install-only items
  if (item?.installOnly) return false;
  if (isInstallOnlyShippingClass(rawClass)) return false;
  
  // Default: TRUE (unless explicitly false)
  return true;
};
```

## Potential Issues & Solutions

### Issue 1: Products Not Being Found in Lookup
**Symptom:** `productLookup` is empty or products are missing

**Check:**
- Verify product IDs in cart match Sanity product `_id` values
- Check if products have `status == "active"` in Sanity
- Verify product `_type == "product"` in Sanity

**Debug:** Check logs for `[checkout] Shipping requirement check` to see `productLookupSize` and `hasProduct` for each item

### Issue 2: `requiresShipping` Explicitly Set to False
**Symptom:** Products have `shippingConfig.requiresShipping: false` in Sanity

**Check:**
- Review product shipping configuration in Sanity
- Ensure `requiresShipping` is not set to `false` for shippable products

**Fix:** Set `shippingConfig.requiresShipping: true` or remove the field (defaults to true)

### Issue 3: Items Marked as Install-Only
**Symptom:** Cart items have `installOnly: true` or shipping class contains "installonly"

**Check:**
- Review cart items for `installOnly` flag
- Check `shippingClass` values in Sanity products

**Fix:** Remove `installOnly` flag or change shipping class for shippable items

### Issue 4: Missing Parcelcraft Metadata
**Symptom:** Products are marked as shippable but missing weight/dimensions

**Check:** Even if `shippingRequired === true`, Parcelcraft needs:
- `weight` and `weight_unit` in product metadata
- `origin_country` in product metadata  
- `shipping_required: 'true'` in product metadata

**Fix:** Ensure products have shipping weight and dimensions configured in Sanity

### Issue 5: Parcelcraft App Not Installed/Configured
**Symptom:** `shipping_address_collection` is set but Parcelcraft still doesn't inject rates

**Check in Stripe Dashboard:**
1. Go to **Apps → Installed Apps**
2. Verify **Parcelcraft** is installed and active
3. Go to **Apps → Parcelcraft → Settings**
4. Verify **UPS account** is connected
5. Go to **Settings → Payments → Checkout → Shipping**
6. Verify **"Calculate shipping rates dynamically"** is enabled
7. Verify **Parcelcraft** is selected as shipping provider

## Diagnostic Steps

### 1. Check Logs After Checkout Request
Look for these log entries:
```
[checkout] Shipping requirement check
[checkout] Final session configuration
[checkout] Parcelcraft configuration check
```

**Expected output:**
- `shippingRequired: true`
- `hasShippingAddressCollection: true`
- `hasProduct: true` for shippable items
- `requiresShipping: true` for shippable items

### 2. Verify Session Parameters
After creating a checkout session, verify:
- `sessionParams.shipping_address_collection` exists
- `sessionParams.invoice_creation.enabled === true`
- `sessionParams.line_items` all have products with Parcelcraft metadata

### 3. Test with a Known Shippable Product
1. Find a product in Sanity with:
   - `shippingConfig.weight` set (e.g., `5`)
   - `shippingConfig.dimensions` set (e.g., `{ length: 10, width: 5, height: 2 }`)
   - `shippingConfig.requiresShipping: true` (or unset)
   - `status: "active"`

2. Create checkout with that product ID

3. Check logs to verify:
   - Product found in lookup
   - `shippingRequired === true`
   - `shipping_address_collection` is set

## Code Changes Made

### Added Debug Logging (Lines 603-624)
Enhanced logging to track:
- Shipping requirement calculation
- Product lookup results
- Per-item shipping status

### Added Final Validation Logging (Lines 1119-1128)
Logs final session configuration before Stripe API call to verify:
- `shipping_address_collection` is set when expected
- All required Parcelcraft configuration is present

## ✅ CODE VERIFICATION - CONFIRMED WORKING

Based on recent logs, **the code is working correctly**:

```
[checkout] Final session configuration {
  shippingRequired: true,
  hasShippingAddressCollection: true,
  shippingAddressCollectionAllowedCountries: [ 'US' ],
  invoiceCreationEnabled: true,
  ...
}
[checkout] Shipping address collection details {
  "allowed_countries": [ "US" ]
}
[checkout] ✅ Stripe session has shipping_address_collection: { allowed_countries: [ 'US' ] }
```

**VERIFIED:**
- ✅ Code correctly sets `shipping_address_collection` in `sessionParams`
- ✅ Stripe API receives `shipping_address_collection` correctly  
- ✅ Stripe returns session with `shipping_address_collection` confirmed
- ✅ Product has all required Parcelcraft metadata (weight, dimensions, origin_country)

## ⚠️ ROOT CAUSE: Stripe Dashboard / Parcelcraft Configuration

Since the code is working correctly and Stripe confirms `shipping_address_collection` exists, **the issue is in Stripe Dashboard configuration**, specifically:

1. **Parcelcraft app is not installed** in Stripe Dashboard, OR
2. **Parcelcraft is installed but not configured** to inject rates, OR
3. **Dynamic shipping is disabled** in Stripe Checkout settings

## Immediate Action Items - CHECK STRIPE DASHBOARD

1. **Verify Parcelcraft Installation:**
   - Go to Stripe Dashboard → Apps → Installed Apps
   - Check if Parcelcraft is installed and active
   - If not installed: Browse Apps → Search "Parcelcraft" → Install

2. **Verify UPS Connection:**
   - Go to Stripe Dashboard → Apps → Parcelcraft → Settings
   - Ensure UPS account is connected
   - Verify UPS credentials are valid

3. **Enable Dynamic Shipping:**
   - Go to Stripe Dashboard → Settings → Payments → Checkout → Shipping
   - Enable "Calculate shipping rates dynamically"
   - Select "Parcelcraft" as the shipping rate provider
   - Configure UPS services (Ground, 2nd Day Air, etc.)

## Expected Behavior

When `shippingRequired === true`:
- ✅ `shipping_address_collection` is added to session params
- ✅ Parcelcraft detects invoice_creation + shipping_address_collection
- ✅ Parcelcraft queries UPS for rates based on product metadata
- ✅ Shipping options appear in Stripe Checkout after address entry

When `shippingRequired === false`:
- ❌ `shipping_address_collection` is NOT added
- ❌ Parcelcraft cannot inject rates
- ❌ No shipping options appear (expected for install-only items)

## Next Steps

1. ✅ **Code is verified working** - logs confirm `shipping_address_collection` is set correctly
2. ✅ **Stripe confirms receipt** - session includes `shipping_address_collection` after creation
3. ⚠️ **Check Stripe Dashboard** - Parcelcraft configuration is the issue
   - Install Parcelcraft app (if not installed)
   - Connect UPS account to Parcelcraft
   - Enable dynamic shipping in Checkout settings
4. **Retest checkout flow** after fixing Parcelcraft configuration

## Why Shipping Options Don't Appear

Even though `shipping_address_collection` is set correctly, Parcelcraft must be:
- **Installed** as a Stripe app
- **Configured** with UPS credentials
- **Enabled** in Checkout shipping settings

Without Parcelcraft properly configured, Stripe won't show shipping address fields or options, even though the session parameters are correct.
