# Checkout Shipping Architecture Options

## Option 1 – Single source of truth: `fas-sanity` Netlify functions (preferred)
- **Single-source-of-truth definition:** `getShippingQuoteBySkus`/`createCheckoutSession` in `fas-sanity` own the carrier integration and rate metadata. `fas-cms-fresh` only orchestrates cart data + the selected EasyPost quote and forwards it to Stripe, while all carrier IDs, plan descriptions, and shipment IDs live inside the Sanity backend.
- **Data flow:**
  ```
  (fas-cms storefront) Cart + shipping address
        ↓ POST to /api/shipping-quote (new fas-cms proxy)
  (fas-cms proxy) ↔ fetch https://<sanity>/.netlify/functions/getShippingQuoteBySkus {cart,destination,quoteKey}
        ↓ Live rates + shipmentId metadata
  (fas-cms storefront) Customer selects rate → /api/checkout
        ↓ server builds Stripe sessionParams.shipping_options from chosen EasyPost rate (carrier/service/rateId)
  Stripe Checkout shows live EasyPost shipping option → charges shipping
        ↓ Stripe webhook → `src/pages/api/webhooks.ts` stores metadata in Sanity order
  (fas-sanity label tooling) create-shipping-label.ts uses stored EasyPost rate/shipment IDs paid later
  ```
- **Idempotency strategy:** quote requests carry a deterministic `quoteKey` (hash of `cart` + `destination`) so `getShippingQuoteBySkus` can reuse an existing EasyPost `shipment.id` saved on a temporary Sanity `shippingQuote` doc (avoiding duplicate shipments for retries, and retaining `rateId`). Stripe metadata will include that `quoteKey`/`shipmentId` for downstream correlation.
- The cache document now records `source` (`fresh` vs `cache`), `rateCount`, `cartSummary`, `createdAt`, and `expiresAt`, and the API response mirrors those fields so you can explain why the customer saw a specific carrier rate.
- **Error handling:** propagate Sanity function errors (missing address, EasyPost downtime) to the storefront with user-friendly copy; backend logs include the `quoteKey`, cart summary, and EasyPost error text; Stripe checkout is not created until a rate exists.
- **Rates inside Stripe UI:** `fas-cms` builds `sessionParams.shipping_options` with the selected EasyPost rate (`fixed_amount`, `display_name`, `delivery_estimate`, metadata). Because the rate originates from `getShippingQuoteBySkus`, Stripe displays the live carrier amount rather than the legacy estimator.
- **Label purchase approach:** `create-shipping-label.ts`/EasyPost webhooks in `fas-sanity` remain the only label creators; they consume the stored `easypostRateId`, `carrier`, and `shipmentId` that the quote wrote into the `order`. Manual label purchases run through the Sanity backend or rely on the same EasyPost client logic, avoiding duplication.
- **Pros:** reuses existing EasyPost quoting + label tooling, keeps carrier credentials centralized, Sanity already owns schema/data (order fields, shipping log). `fas-cms` only needs to call the Netlify function and lift the returned metadata into Stripe. Live rates appear immediately; there is no need to duplicate EasyPost clients/UI.
- **Cons:** `fas-cms` must call an external domain (requires a config value + CORS allow list). The storefront also needs a step to gather a shipping address before checkout so that `getShippingQuoteBySkus` can run. Sanity must store `quoteKey`/shipment data to avoid duplicate EasyPost shipments.

## Option 2 – Single source of truth: `fas-cms-fresh` handles EasyPost directly
- **Single-source-of-truth definition:** Abandon `fas-sanity` quoting and re-implement the EasyPost integration inside `fas-cms-fresh/src/pages/api/checkout.ts`, making it the authoritative shipping quote + rate source. Carrier calls, idempotency, and metadata live in the storefront repo.
- **Data flow:**
  ```
  (fas-cms storefront) Cart + shipping address
        ↓ direct POST to /api/checkout
  (fas-cms) ↔ EasyPost.Shipment.create + /smartrate (internal helper)
        ↓ live rates
  (fas-cms) builds Stripe sessionParams.shipping_options from EasyPost rate metadata
  Stripe Checkout charges carrier amount and sends metadata in webhook
  (fas-cms webhooks) writes Sanity order, then `fas-sanity` label tooling still uses `create-shipping-label.ts` but reads inserted `shipmentId`/`rateId`
  ```
- **Idempotency strategy:** `fas-cms` keeps a local `quoteKey`/`shipmentId` store (in Memory/Redis or Sanity) so retries reuse the same EasyPost shipment and avoid accumulating extra shipments. The `checkout` handler must detect repeated quote requests for the same cart/address and reuse the cached `shipmentId` and `rates`.
- **Error handling:** same as today but now the checkout endpoint also handles EasyPost errors; missing address or carrier throttling returns a 4xx/5xx before creating the Stripe session, with logs recording the payload and EasyPost response body.
- **Rates inside Stripe UI:** the checkout route directly uses the fetched EasyPost rate when it adds the `shipping_options` array (same as current `shippingQuote` logic but the amount is no longer heuristic). Stripe sees the live rate because the amount now comes from EasyPost.
- **Label purchase approach:** `fas-sanity` `create-shipping-label.ts` would need to accept the carrier metadata inserted by `fas-cms` (e.g., `shipmentId`, `easypostRateId`) and either re-use that shipment or create a new one only if the quote metadata is missing. The label purchase action remains in `fas-sanity` so that we keep a single tooling surface for fulfillment.
- **Pros:** Avoids cross-service coordination; the storefront already runs the existing checkout route, so the easiest change is to replace the estimator with a carrier call. Developers don’t need to propagate shipping metadata from Sanity functions.
- **Cons:** Duplicates the EasyPost integration (same packaging logic exists in `fas-sanity/getShippingQuoteBySkus.ts`). The storefront now owns more state (shipment caching, idempotency), which increases risk of divergence. Two repos would still compete unless `fas-sanity`’s functions are retired, which is a broader migration.
