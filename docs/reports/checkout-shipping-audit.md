# Checkout Shipping Audit

## Inventory (relevant files)
- `src/pages/api/checkout.ts` (fas-cms-fresh): builds line items, loads `shippingConfig` from Sanity, runs `estimateShippingForCart`/`buildShippingQuote` (lines 224‑440) and writes `shipping_options` + metadata that Stripe collects on redirect (lines 820‑940).
- `src/pages/api/webhooks.ts` (fas-cms-fresh): listens for Stripe `checkout.session.completed`, assembles product shipping snapshots, reads `session.metadata.shipping_*`, and writes the Sanity `order` document with `weight`, `dimensions`, `carrier`, `service`, `shippoRateId`, and `shippingAddress` (lines 460‑640).
- `netlify/functions/getShippingQuoteBySkus.ts` (fas-sanity): queries the same Sanity catalog, enforces freight/install rules, creates an Shippo shipment, fetches `shipment.rates` + SmartRates, and returns live `rates`, `bestRate`, and `packages` to the caller (lines 200-520).
- An `_type == "shippingQuote"` cache document now stores `quoteKey`, `quoteRequestId`, `shippoShipmentId`, `source`, `rateCount`, `cartSummary`, `createdAt`, and `expiresAt` so repeated cart/address combos reuse the same Shippo shipment until the TTL expires.
- `netlify/functions/createCheckoutSession.ts` (fas-sanity): accepts `cart` + user-selected shipping rate, enriches Stripe line items with product weight/dimensions metadata, builds `shipping_options` from the Shippo rate, and persists a `checkoutSession` document (lines 150‑420).
- `src/pages/api/create-shipping-label.ts` (fas-sanity): purchases a label via Shippo using saved order data, marks `labelPurchased`, stores tracking info, and links the Shippo shipment ID into the Sanity `order` doc.
- `netlify/functions/shippoWebhook.ts` + `stripe-shipping-webhook.ts` (fas-sanity): receive Shippo/Stripe events and update `order.shippingStatus`, `shippingLog`, `trackingNumber`, `shippingLabelUrl`, etc., including `linkShipmentToOrder` (shippo webhook lines 1‑260 & 714) and idempotent logging of webhook events (stripe shipping webhook lines 1‑210).
- `packages/sanity-config/src/schemaTypes/documents/order.tsx` (shared package): defines `order.weight`, `order.dimensions`, `order.shippingAddress`, `order.carrier/service/trackingNumber`, and the shipping log/status fields that downstream automation relies on (lines 500‑720).

## Current flow (cart → checkout → Stripe → order → shipping)
2. **Stripe completes payment**: Stripe triggers `/api/webhooks.ts`, which reads the session, extracts shipping metadata (e.g., `shipping_rate_label`, `shipping_rate_amount`, `shipping_delivery_days`), and uses persisted product shipping weights/dims to populate `order.weight`, `order.dimensions`, and `order.shippingAddress`. It writes carrier/service/`shippoRateId` from the metadata into the Sanity `order` (lines 509‑640).

## Where shipping is computed now
- The resulting `ShippingQuoteResult` is forced into Stripe via `shipping_options` (lines 820‑923) and is the only shipping amount that Stripe is ever told about from the storefront side.

## Live rate calls today
- **fas-cms-fresh**: **No live carrier call exists.** `checkout.ts` never reaches out to Shippo or any shipping provider; shipping amounts are derived from local weight/dimension heuristics and default environment constants, so Stripe sees a fixed rate (`shipping_rate_data.fixed_amount`).
- **fas-sanity**: `netlify/functions/getShippingQuoteBySkus.ts:200‑520` uses the same Sanity catalog to identify weights/dimensions, then calls `Shippo.Shipment.create` plus `smartrate` to fetch carrier rates (UPS/USPS/FedEx). That function returns the `rates` array plus `bestRate` to the caller, making true live carrier costs available for Stripe and UI components.

## Duplication & risk areas
- Two separate shipping quote implementations share overlapping data (Sanity `product.shippingConfig`, order fields), but only one speaks to carriers. `fas-cms` keeps a local estimator (`estimateShippingForCart`) while `fas-sanity` already wraps Shippo (`getShippingQuoteBySkus`). Maintaining both means: stale logic drift (env constants vs. carrier data), parallel requirements for metadata (`shipping_rate_label` vs. Shippo's `carrier/service/rateId`), and duplicated maintenance.
- The `getShippingQuoteBySkus` function creates an Shippo shipment for every quote. If `fas-cms` were to call it repeatedly for the same cart/address (e.g., due to retries), multiple unused shipments would accumulate unless we introduce request deduplication or reuse logic.


## Cross-repo interaction map
| Caller | Callee / Authority | Payload highlights | Side effects |
| --- | --- | --- | --- |
| `fas-cms-fresh` `/api/webhooks.ts` | Sanity order doc | Stripe session details, shipping metadata (`shipping_rate_label`, `shipping_rate_amount`, `shipping_delivery_days`) | Persists `order` with `weight`, `dimensions`, `carrier`, `service`, `shippoRateId`, `shippingAddress` |
| `fas-sanity` `getShippingQuoteBySkus` | Sanity catalog + Shippo | `{cart, destination}` → Shippo `Shipment.create`; returns live `rates`, `bestRate`, `shipment.id` | Creates Shippo shipment/smart rates (currently per call) |
| `fas-sanity` `create-shipping-label` / Shippo webhooks | Sanity order shippers | Shippo label purchase, tracking updates | Marks `labelPurchased`, stores `trackingNumber`, updates `shippingStatus` via `shippoWebhook.ts` and `stripe-shipping-webhook.ts` |
