# 🎯 Quick Setup Checklist

## ✅ Files Created
- [x] `/src/pages/api/stripe/shipping-rates-webhook.ts` - Webhook endpoint
- [x] `WEBHOOK_SETUP_GUIDE.md` - Detailed instructions

---

## ⚡ Next 3 Steps (5 minutes)

### **1. Add Environment Variables** 📝

Add to `fas-cms-fresh/.env`:

```bash
SHIPPO_API_KEY=EZAK_...
SHIPPO_API_BASE=https://api.shippo.com
WAREHOUSE_ADDRESS_LINE1=6161 Riverside Dr
WAREHOUSE_ADDRESS_LINE2=
WAREHOUSE_CITY=Punta Gorda
WAREHOUSE_STATE=FL
WAREHOUSE_ZIP=33982
WAREHOUSE_PHONE=812-200-9012
WAREHOUSE_EMAIL=orders@updates.fasmotorsports.com
```

### **2. Configure Stripe Dashboard** ⚙️

1. Go to: **Stripe Dashboard → Settings → Payments → Checkout**
2. Enable: ☑️ **"Calculate shipping rates dynamically"**
3. Go to: **Developers → Webhooks → Add endpoint**
4. URL: `https://fasmotorsports.com/api/stripe/shipping-rates-webhook`
5. Event: `checkout.session.async_shipping_options`
6. Copy webhook secret → paste into `.env`

### **3. Deploy & Test** 🚀

```bash
# Commit & push
git add .
git commit -m "Add Stripe Adaptive Pricing webhook"
git push

# Test checkout
# Go to: https://fasmotorsports.com/checkout
# Enter address → Rates should appear!
```

---

## 🔍 How to Know It's Working

**Success Signs:**

✅ In Stripe Dashboard → Webhooks → See successful webhook calls  
✅ In checkout → Enter address → See shipping options appear  
✅ Server logs → See `[ShippingWebhook] ✅` messages  
✅ Can complete purchase with shipping rate selected  

**Failure Signs:**

❌ No shipping options appear after entering address  
❌ Server logs show `[ShippingWebhook] ❌` errors  
❌ Customer can't complete checkout  

---

## 🆘 Quick Troubleshooting

**Issue:** Webhook returns 401  

**Issue:** Webhook returns 400  
**Fix:** Verify `cart` is in session metadata (see create-checkout-session.ts)

**Issue:** Webhook returns 500  
**Fix:** Check Shippo keys and warehouse address env vars are set

**Issue:** No rates appear  
**Fix:** Check Stripe Dashboard → Webhooks → View logs for errors

---

## 📁 Important Files

**Created:**
- `src/pages/api/stripe/shipping-rates-webhook.ts` - The webhook
- `WEBHOOK_SETUP_GUIDE.md` - Full setup instructions
- This file - Quick reference

**Already Fixed:**
- `src/components/checkout/EmbeddedCheckout.tsx` - Removed conflicting handler
- `src/pages/api/stripe/create-checkout-session.ts` - Already configured correctly

**Integration Docs (for reference):**
- `/home/claude/SHIPPO_STRIPE_INTEGRATION_PLAN.md`
- `/home/claude/CODE_CHANGES_GUIDE.md`
- `/home/claude/INTEGRATION_CHECKLIST.md`

---

## 🎯 Current Status

✅ Webhook file created  
✅ Frontend fixed (removed onShippingDetailsChange)  
✅ Backend configured (shipping_address_collection enabled)  
⏳ **Next:** Add env vars + configure Stripe Dashboard + deploy  
⏳ **Then:** Test and verify rates appear  

**Estimated time to completion:** 10 minutes

---

## 💡 Pro Tips

1. **Test locally first** using `stripe listen --forward-to http://localhost:4321/api/stripe/shipping-rates-webhook`
2. **Check logs** - Both Stripe Dashboard and your server logs
3. **Verify cart metadata** - Session must have cart data in metadata
4. **Monitor Shippo calls** - Check Shippo dashboard for shipment rate requests

**You're 95% there! Just need to configure Stripe Dashboard and deploy.** 🚀
