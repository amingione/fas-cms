# 🚀 Webhook Setup Instructions

## ✅ Step 1: Add Environment Variables

Add these to your `.env` file in `fas-cms-fresh`:

```bash
# Stripe Adaptive Pricing Webhook Secret
# Get this from Stripe Dashboard after configuring the webhook
STRIPE_SHIPPING_WEBHOOK_SECRET=YOUR_STRIPE_SHIPPING_WEBHOOK_SECRET

# Shippo API (for checkout rate calculation)
SHIPPO_API_KEY=EZAK_...
SHIPPO_API_BASE=https://api.shippo.com
WAREHOUSE_ADDRESS_LINE1=6161 Riverside Dr
WAREHOUSE_ADDRESS_LINE2=
WAREHOUSE_CITY=Punta Gorda
WAREHOUSE_STATE=FL
WAREHOUSE_ZIP=33982
WAREHOUSE_PHONE=812-200-9012
WAREHOUSE_EMAIL=orders@updates.fasmotorsports.com

# Existing variables (should already be set)
STRIPE_SECRET_KEY=sk_live... # or sk_test...
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live... # or pk_test...
```

---

## ✅ Step 2: Configure Stripe Dashboard

### **A. Enable Adaptive Pricing:**

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to: **Settings → Payments → Checkout**
3. Scroll to **"Shipping rates"**
4. Enable: ☑️ **"Calculate shipping rates dynamically"**
5. Save changes

### **B. Add Webhook Endpoint:**

1. Go to: **Developers → Webhooks**
2. Click **"Add endpoint"**
3. Set **Endpoint URL:**
   ```
   https://fasmotorsports.com/api/stripe/shipping-rates-webhook
   ```
   
4. Under **"Events to send"**, select:
   - ☑️ `checkout.session.async_shipping_options`
   
5. Click **"Add endpoint"**

### **C. Get Webhook Secret:**

1. After creating the endpoint, click on it
2. Click **"Reveal"** next to "Signing secret"
3. Copy the secret from the Stripe Dashboard
4. Add it to your `.env` file as `STRIPE_SHIPPING_WEBHOOK_SECRET`

---

## ✅ Step 3: Test Locally (Optional)

### **A. Start Local Dev Server:**

```bash
cd fas-cms-fresh
npm run dev
```

### **B. Use Stripe CLI to Forward Webhooks:**

```bash
# Forward webhooks to local server
stripe listen --forward-to http://localhost:4321/api/stripe/shipping-rates-webhook

# This will output a webhook secret like:
# webhook_signing_secret_placeholder
# Use this temporarily in your .env for local testing
```

### **C. Test the Flow:**

1. Add item to cart
2. Go to checkout
3. Enter shipping address
4. Watch console logs for webhook activity
5. Shipping rates should appear!

---

## ✅ Step 4: Deploy & Test Production

### **A. Deploy fas-cms-fresh:**

```bash
# Commit the new webhook file
git add src/pages/api/stripe/shipping-rates-webhook.ts
git commit -m "Add Stripe Adaptive Pricing webhook for dynamic shipping"
git push

# Deploy will happen automatically (Netlify/Vercel)
```

### **B. Test Production Checkout:**

1. Go to: https://fasmotorsports.com/checkout
2. Enter a real shipping address
3. Shipping rates should appear dynamically!

---

## 🔍 Troubleshooting

### **Problem: Webhook returns 401 (Unauthorized)**

**Solution:** Check that `STRIPE_SHIPPING_WEBHOOK_SECRET` is set correctly in `.env`

### **Problem: Webhook returns 400 (Missing cart data)**

**Solution:** Verify `create-checkout-session.ts` has this in metadata:
```typescript
metadata: {
  cart: JSON.stringify(cartItems.map(item => ({
    sku: item.sku || item.id,
    quantity: item.quantity
  })))
}
```

### **Problem: Webhook returns 500 (Shippo failed)**

**Solution:** 
- Check Shippo API key and warehouse address env vars
- Verify Shippo API status in dashboard

### **Problem: No shipping rates appear**

**Solution:**
1. Check Stripe Dashboard → Developers → Webhooks → View logs
2. Look for webhook errors
3. Check browser console for errors
4. Verify `shipping_address_collection` is enabled in session creation

---

## 📊 Monitoring

### **Check Webhook Activity:**

**Stripe Dashboard:**
- Developers → Webhooks → Click your endpoint → View logs

**Server Logs:**
- Look for `[ShippingWebhook]` prefixed logs
- Check for Shippo rate requests
- Verify rates are being returned from Shippo

---

## 🎯 Success Criteria

When everything is working:

✅ Customer enters address in Stripe Checkout  
✅ Webhook receives address and session ID  
✅ Cart data extracted from session metadata  
✅ Shippo rates fetched from fas-sanity  
✅ Rates formatted and returned to Stripe  
✅ **Shipping options appear in checkout UI!** 🎉  
✅ Customer selects rate and completes payment  
✅ Order stores Shippo metadata for label creation  

---

## 📝 Next Steps After Webhook Works

Once shipping rates are appearing:

1. **Update Order Webhook** - Store Shippo metadata in orders
2. **Update Label Creation** - Use stored shipment/rate IDs
3. **Test End-to-End** - Create order → generate label → track shipment
4. **Monitor & Optimize** - Check rate accuracy, delivery estimates

---

## 🆘 Need Help?

Common issues and solutions are in the troubleshooting section above.

For detailed technical info, see:
- `/home/claude/SHIPPO_STRIPE_INTEGRATION_PLAN.md`
- `/home/claude/CODE_CHANGES_GUIDE.md`

**Current Status:** ✅ Webhook file created, ready for deployment!
