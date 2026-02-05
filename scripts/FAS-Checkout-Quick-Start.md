# FAS Unified Checkout - Quick Start

**30-Second Overview:** Stripe Elements + Shippo dynamic shipping on a single checkout page.

---

## 🚀 Fast Setup (5 minutes)

```bash
# 1. Environment
cp .env.example .env
# Edit .env - add your Stripe, Shippo, Medusa, Sanity keys

# 2. Dependencies
npm install stripe shippo @sanity/client

# 3. Validate
node scripts/validate-checkout-setup.js

# 4. Test connections
node scripts/test-connections.js

# 5. Start
npm run dev

# 6. Test
# http://localhost:4321/checkout
# Card: 4242 4242 4242 4242
```

---

## 🔑 Required API Keys

| Service | Get From | Env Var |
|---------|----------|---------|
| **Stripe** | [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys) | `STRIPE_SECRET_KEY`<br>`PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| **Shippo** | [apps.goshippo.com/settings/api](https://apps.goshippo.com/settings/api) | `SHIPPO_API_KEY` |
| **Medusa** | Your Medusa backend | `MEDUSA_API_URL` |
| **Sanity** | [sanity.io/manage](https://www.sanity.io/manage) → API → Tokens | `SANITY_PROJECT_ID`<br>`SANITY_API_TOKEN` |

---

## 📦 What You Got

### Frontend
- ✅ `checkout.astro` - Checkout page
- ✅ `CheckoutForm.tsx` - Stripe Elements integration
- ✅ `CheckoutForm.css` - Dark theme styling
- ✅ `order/confirmation.astro` - Success page

### API Routes
- ✅ `create-payment-intent.ts` - Initialize payment
- ✅ `shipping-rates.ts` - Fetch Shippo rates
- ✅ `update-payment-intent.ts` - Dynamic amount updates ⭐
- ✅ `cart/[id].ts` - Get cart data
- ✅ `complete-order.ts` - Create order + sync Sanity

### Tools
- ✅ `validate-checkout-setup.js` - Fast validation
- ✅ `test-connections.js` - API connection tests

---

## 🎯 Key Features

| Feature | Status |
|---------|--------|
| Single-page checkout | ✅ |
| Real-time UPS shipping rates | ✅ |
| Dynamic amount updates | ✅ |
| Stripe 3D Secure | ✅ |
| Order sync to Sanity | ✅ |
| Mobile responsive | ✅ |

---

## 🔄 Data Flow

```
Customer → Checkout Page
    ↓
Enter Address → Fetch Shippo Rates (2s)
    ↓
Select Shipping → Update Payment Intent
    ↓
Enter Card → Stripe Payment
    ↓
Payment Succeeds → Create Medusa Order
    ↓
Sync to Sanity → Confirmation Page
```

---

## 🧪 Test Cards

| Card | Result |
|------|--------|
| `4242 4242 4242 4242` | ✅ Success |
| `4000 0000 0000 0002` | ❌ Decline |
| `4000 0025 0000 3155` | ⚠️ 3D Secure |

---

## 🐛 Common Issues

**"Cart not found"**
```bash
# Set cart_id cookie in browser console
document.cookie = 'cart_id=cart_YOUR_ID; path=/'
```

**"No shipping rates"**
- Check SHIPPO_API_KEY in .env
- Verify warehouse address configured
- Use complete US address

**"Medusa connection refused"**
```bash
# Start Medusa first
cd ../fas-medusa && npm run dev
```

**"Stripe version error"**
- Update API version in code to `2024-12-18.acacia`
- Or newer from [Stripe API versions](https://stripe.com/docs/api/versioning)

---

## 📚 Full Documentation

- **Setup Guide:** `FAS-Unified-Checkout-Setup-Guide.md` (complete config)
- **Implementation:** `FAS-Unified-Checkout-Implementation-Summary.md` (architecture)
- **Scripts:** `scripts/README.md` (validation tools)

---

## 💡 Next Steps After Testing

### Immediate (Before Production)
- [ ] Add real product dimensions to Sanity
- [ ] Set up Stripe webhook handler
- [ ] Test with production API keys
- [ ] Configure fulfillment UI in Sanity

### Future Enhancements
- [ ] Order tracking page
- [ ] Email notifications
- [ ] Cart management UI
- [ ] Promo code support
- [ ] Inventory sync

---

## 🎉 Success Criteria

Your checkout is working when:

1. ✅ All validation scripts pass
2. ✅ Stripe test card processes successfully
3. ✅ Shipping rates appear within 2 seconds
4. ✅ Total updates when selecting shipping
5. ✅ Order appears in Medusa
6. ✅ Order syncs to Sanity
7. ✅ Confirmation page displays

---

## 🆘 Get Help

**Quick Checks:**
```bash
# Validate everything
node scripts/validate-checkout-setup.js

# Test connections
node scripts/test-connections.js

# Check Medusa
curl http://localhost:9000/health

# Check Stripe
curl https://api.stripe.com/v1/charges \
  -u $STRIPE_SECRET_KEY: -d amount=100 -d currency=usd
```

**Resources:**
- Stripe Docs: [docs.stripe.com/payments/payment-intents](https://docs.stripe.com/payments/payment-intents)
- Shippo Docs: [goshippo.com/docs](https://goshippo.com/docs)
- Medusa Docs: [docs.medusajs.com](https://docs.medusajs.com)

**Issues?** Check `FAS-Unified-Checkout-Setup-Guide.md` troubleshooting section.

---

**Version:** 1.0.0 | **Updated:** Feb 2026 | **Status:** ✅ Ready for Testing
