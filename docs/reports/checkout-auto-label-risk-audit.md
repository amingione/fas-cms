# Checkout Auto-Label Risk Audit — fas-cms-fresh

## Audit Method
- `rg -n "/api/shipping/quote" -n` to find quote consumers.
- `rg -n "create-shipping-label"` to confirm no label purchase flows exist in this repo.

## Quote APIs
- `src/components/checkout/CheckoutPage.tsx` — SAFE: shipping quote only runs after the reducer reflects a fully filled address and the user explicitly requests rates.
- `src/pages/api/shipping/quote.ts` — SAFE: proxies to `/.netlify/functions/getShippingQuoteBySkus` and only returns read-only rate data after validating the destination.
- `netlify/functions/getShippingQuoteBySkus.ts` — SAFE: existing quote-only handler with no label creation path.

## Label Purchase APIs
- (none in this repo; checkout flow does not touch label creation.)

## Shipping Webhooks
- (none in this repo.)
