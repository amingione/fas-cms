# Checkout Setup Validation Scripts

Quick tools to validate your unified checkout configuration before testing.

## Scripts

### 1. `validate-checkout-setup.js`

**Fast validation** - Checks files, dependencies, and environment variables without making API calls.

```bash
node scripts/validate-checkout-setup.js
```

**Checks:**
- ✓ Node.js version (18+)
- ✓ Required dependencies installed
- ✓ Environment variables configured
- ✓ Warehouse address set
- ✓ All checkout files exist

**Runtime:** ~1 second

---

### 2. `test-connections.js`

**Full integration test** - Makes actual API calls to verify credentials work.

```bash
node scripts/test-connections.js
```

**Tests:**
- ✓ Stripe: Create test Payment Intent
- ✓ Shippo: Fetch real shipping rates
- ✓ Medusa: Health check + Store API
- ✓ Sanity: Read/write permissions

**Runtime:** ~5-10 seconds

---

## Recommended Workflow

### First Time Setup

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Edit .env with your API keys
# (Stripe, Shippo, Medusa, Sanity)

# 3. Install dependencies
npm install stripe shippo @sanity/client

# 4. Quick validation (no API calls)
node scripts/validate-checkout-setup.js

# 5. Full connection test (with API calls)
node scripts/test-connections.js

# 6. Start dev server
npm run dev

# 7. Test checkout
# http://localhost:4321/checkout
```

---

## Troubleshooting

### "stripe not found"
```bash
npm install stripe shippo @sanity/client
```

### ".env file missing"
```bash
cp .env.example .env
# Then edit .env with your keys
```

### "Stripe authentication failed"
- Check STRIPE_SECRET_KEY starts with `sk_test_` or `sk_live_`
- Get keys: https://dashboard.stripe.com/apikeys

### "Shippo authentication failed"
- Check SHIPPO_API_KEY starts with `shippo_test_` or `shippo_live_`
- Get key: https://apps.goshippo.com/settings/api

### "Medusa connection refused"
```bash
# Start Medusa backend first
cd ../fas-medusa
npm run dev
```

### "Sanity insufficient permissions"
- Token needs **Editor** permissions
- Create token: https://www.sanity.io/manage → API → Tokens

---

## CI/CD Integration

Add to your CI pipeline:

```yaml
# .github/workflows/test.yml
- name: Validate checkout setup
  run: node scripts/validate-checkout-setup.js

- name: Test API connections
  run: node scripts/test-connections.js
  env:
    STRIPE_SECRET_KEY: ${{ secrets.STRIPE_SECRET_KEY }}
    SHIPPO_API_KEY: ${{ secrets.SHIPPO_API_KEY }}
    # ... other secrets
```

---

## What Gets Tested

### validate-checkout-setup.js ✓
- [x] Node.js 18+ installed
- [x] stripe package installed
- [x] shippo package installed
- [x] @sanity/client package installed
- [x] .env file exists
- [x] All required env vars present
- [x] Env var formats (pk_*, sk_*, etc.)
- [x] Warehouse address configured
- [x] All checkout component files exist
- [x] All API route files exist

### test-connections.js ✓
- [x] Stripe authentication works
- [x] Stripe Payment Intent creation
- [x] Shippo authentication works
- [x] Shippo rate quotes work
- [x] UPS rates available
- [x] Medusa backend reachable
- [x] Medusa Store API accessible
- [x] Sanity authentication works
- [x] Sanity read permissions
- [x] Sanity write permissions

---

## Error Codes

| Exit Code | Meaning |
|-----------|---------|
| 0 | All checks passed |
| 1 | Critical errors found |

Use in scripts:
```bash
if node scripts/validate-checkout-setup.js; then
  echo "Setup valid!"
  npm run dev
else
  echo "Fix errors first"
  exit 1
fi
```

---

## Support

Issues? Check:
- [Setup Guide](../FAS-Unified-Checkout-Setup-Guide.md)
- [Implementation Summary](../FAS-Unified-Checkout-Implementation-Summary.md)

Still stuck? Open issue in fas-cms-fresh repo.
