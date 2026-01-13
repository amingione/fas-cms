# Testing Parcelcraft Transit Times

## Quick Start

### Option 1: Use an Existing Checkout Session

If you already created a checkout in Stripe Dashboard with Parcelcraft rates:

```bash
# List recent sessions
yarn tsx scripts/list-recent-checkout-sessions.ts

# Check a specific session
yarn tsx scripts/check-parcelcraft-transit-times.ts <session_id>
```

### Option 2: Create a New Test Checkout

```bash
# Create a test checkout (local address - should show 1-2 days)
yarn tsx scripts/create-test-checkout-with-shipping.ts "Los Angeles" "CA" "90001"

# Create a test checkout (cross-country - should show 4-7 days)
yarn tsx scripts/create-test-checkout-with-shipping.ts "New York" "NY" "10001"
```

Then:
1. Open the URL from the script output
2. Enter the shipping address when prompted
3. Wait for Parcelcraft to show UPS shipping options
4. **Check if UPS Ground shows "1 day" for all locations** (this is the bug)
5. After selecting a shipping option, run the check script on the session ID

---

## Step-by-Step Testing Process

### 1. List Recent Sessions

```bash
yarn tsx scripts/list-recent-checkout-sessions.ts 10
```

This shows:
- Recent checkout sessions
- Which ones have shipping configured
- Transit times if available
- Warnings if transit time is always "1 day"

### 2. Check a Specific Session

```bash
yarn tsx scripts/check-parcelcraft-transit-times.ts cs_live_xxxxx
```

This shows detailed information:
- Shipping rate name and amount
- Delivery estimate (minimum/maximum days)
- **WARNING if transit time is hardcoded to 1 day**
- Shipping address
- Metadata from Parcelcraft

### 3. Create Test Checkouts with Different Addresses

Test with various locations to verify transit times vary:

```bash
# Local (same state) - Should show 1-2 days
yarn tsx scripts/create-test-checkout-with-shipping.ts "Los Angeles" "CA" "90001"

# Adjacent state - Should show 2-3 days  
yarn tsx scripts/create-test-checkout-with-shipping.ts "Las Vegas" "NV" "89101"

# Cross-country - Should show 4-7 days
yarn tsx scripts/create-test-checkout-with-shipping.ts "New York" "NY" "10001"
yarn tsx scripts/create-test-checkout-with-shipping.ts "Miami" "FL" "33101"

# Remote area - Should show 5-8 days
yarn tsx scripts/create-test-checkout-with-shipping.ts "Anchorage" "AK" "99501"
```

### 4. Verify the Issue

After creating checkouts and entering addresses:

1. **In Stripe Checkout UI:**
   - Check if UPS Ground always shows "1 day" regardless of destination
   - Note which addresses you tested

2. **Using the Script:**
   ```bash
   yarn tsx scripts/check-parcelcraft-transit-times.ts <session_id>
   ```
   - Look for the warning: `⚠️ WARNING: Transit time is hardcoded to 1 day!`
   - Check the delivery estimate values

---

## What to Look For

### ✅ Correct Behavior
- **Local address (CA to CA)**: 1-2 business days
- **Cross-country (CA to NY)**: 4-7 business days
- **Remote area (CA to AK)**: 5-8 business days
- Transit times **vary** based on destination

### ❌ Bug (Current Issue)
- **All addresses**: Always shows "1 day"
- Transit time is **the same** regardless of destination
- Delivery estimate shows: `Minimum: 1 day, Maximum: 1 day`

---

## Interpreting Script Output

### Good Output (Transit Times Vary)
```
✅ Shipping Rate: UPS Ground
   Transit Time: 4-7 business_day
✅ Transit time range looks correct (4-7 days)
```

### Bad Output (Always 1 Day)
```
✅ Shipping Rate: UPS Ground  
   Transit Time: 1-1 business_day
⚠️  WARNING: Transit time is hardcoded to 1 day!
   This suggests Parcelcraft is not using dynamic UPS transit times.
```

### No Transit Time Data
```
⚠️  No delivery estimate found in shipping rate
   Parcelcraft may not be providing transit time data.
```

---

## Next Steps After Testing

1. **Document the Issue:**
   - Note which addresses always show "1 day"
   - Save session IDs that demonstrate the problem
   - Take screenshots of Stripe Checkout showing incorrect transit times

2. **Contact Parcelcraft Support:**
   - Provide session IDs showing the issue
   - Explain that UPS Ground always shows 1 day regardless of destination
   - Request they enable dynamic transit time calculation using UPS Time-in-Transit API

3. **Check Parcelcraft Settings:**
   - Go to Stripe Dashboard → Apps → Parcelcraft → Settings
   - Verify UPS Time-in-Transit API is enabled
   - Check if there's a default transit time setting that's overriding dynamic calculation

---

## Troubleshooting

### Script says "STRIPE_SECRET_KEY environment variable is required"
- Make sure you have a `.env` file with `STRIPE_SECRET_KEY=sk_...`
- The script uses `dotenv/config` to load environment variables

### No checkout sessions found
- Create a test checkout using the create script or Stripe Dashboard
- Make sure to enter a shipping address so Parcelcraft calculates rates

### Session shows "No shipping cost"
- The session may not have shipping configured
- Make sure you selected a shipping option in the checkout
- Try creating a new test checkout with the create script

---

## Files

- `scripts/list-recent-checkout-sessions.ts` - List recent sessions
- `scripts/check-parcelcraft-transit-times.ts` - Check specific session details
- `scripts/create-test-checkout-with-shipping.ts` - Create test checkouts
- `FIX_PARCELCRAFT_TRANSIT_TIMES.md` - Troubleshooting guide
