# Checkout Shipping Implementation Plan

## Chosen architecture
All shipping quoting and carrier integrations live inside `fas-sanity` Netlify functions (`getShippingQuoteBySkus.ts`, `create-shipping-label.ts`, `easypostWebhook.ts`) and `fas-cms-fresh` becomes a thin consumer. The storefront collects a shipping address, proxies `cart + destination` into `getShippingQuoteBySkus`, and uses the returned EasyPost rate (with rate/ship­ment metadata) to build Stripe `shipping_options`. Shipments, label purchases, and webhook-driven status updates remain in `fas-sanity`, which already owns the Sanity dataset and EasyPost credentials.

## Safe migration sequence
1. **Add shipping-address capture + quote request on the storefront.** Extend the cart/checkout UI to collect the minimal `{addressLine1, city, state, postalCode, country}` that `getShippingQuoteBySkus` already validates (`netlify/functions/getShippingQuoteBySkus.ts:200-450`). Store/validate it client-side and include it in the payload before hitting `/api/checkout`.
2. **Extend `checkoutRequestSchema` & `/api/checkout`.** Allow the request body to carry the normalized destination and, optionally, a `quoteKey` or previously fetched EasyPost rate id. Before calling Stripe, have `/api/checkout` fetch live rates by proxying to `https://{SANITY_FUNCTIONS_BASE_URL}/.netlify/functions/getShippingQuoteBySkus` (new helper). Capture the output (`bestRate`, `rates`, `shipmentId`, `quoteId`) and pick the rate the customer selected (or the API’s `bestRate`).
3. **Ship rate metadata into Stripe.** Build the `shipping_options` array using the EasyPost rate amount, carrier, and service, and add metadata fields (`shipping_quote_id`, `shipping_shipment_id`, `easypost_rate_id`, `shipping_carrier`, `shipping_service`, `shipping_amount`). Keep the Stripe session metadata structure that `webhooks.ts` already reads (update `parseShippingSelection` if needed to use the new metadata keys, `src/pages/api/webhooks.ts:121-155`).
4. **Include quote identifiers on Sanity order docs.** When the webhook persists the order (`src/pages/api/webhooks.ts:509-640`), stash the `quoteKey`, `easyPostShipmentId`, `rates`, and `carrier/service` metadata so downstream label purchases can reuse the shipment instead of recreating it. Ensure `easypostRateId`/`carrier` fields are populated even though the storefront proxy supplies them now.
5. **Make `getShippingQuoteBySkus` idempotent.** Accept a deterministic `quoteKey` (hash of `cart` + `destination` + `quoteKeyOverride`), persist the resulting `shipment.id`, `rates`, and packages inside a dedicated Sanity `_type: 'shippingQuote'` cache document, and, when a request arrives with the same key (and the soft TTL stored in `expiresAt` has not expired), surface the cached rates without calling `Shipment.create`. The cached doc also records `createdAt`, `expiresAt`, `source` (`fresh` vs `cache`), `rateCount`, `cartSummary`, and `quoteRequestId` so dashboards can explain “why this rate” later.
6. **Teach label purchase to reuse the quote.** `src/pages/api/create-shipping-label.ts` now checks `easyPostShipmentId` and reuses the original shipment (returning the existing label info if it already exists) instead of mutating the carrier account twice; only if the stored shipment is missing or invalid does it create a new EasyPost shipment, and it logs that fallback.
7. **Add configuration & hooks.** Introduce `SANITY_FUNCTIONS_BASE_URL` (or similar) in `fas-cms` env list, and update CORS defaults in `fas-sanity/netlify/functions/getShippingQuoteBySkus.ts` to allow the storefront origin. Propagate a `quoteKey` or request ID from the UI through the API for tracing and deduplication.
8. **Monitor & validate.** Once in staging, run a full checkout that pulls rates from EasyPost, includes them in the Stripe session, completes payment, and verifies the Sanity `order` document carries the new metadata (`shipping_quote_id`, `easyPostShipmentId`). Compare EasyPost dashboards to ensure only the intended number of shipments exist for each cart.

## Files/routes/functions to change
- `src/lib/validators/api-requests.ts` (fas-cms): add shipping address schema fields and optional `quoteKey` / `selectedRateId` criteria.
- `src/pages/api/checkout.ts` (fas-cms): replace `estimateShippingForCart` with a call to `getShippingQuoteBySkus`, pass rate metadata into Stripe, and store `quoteKey`/`shipmentId` metadata in the Stripe session.
- Front-end cart/checkout page (`src/pages/checkout/index.astro` + any client scripts): collect shipping destination, fetch quotes (via new helper if needed), let the buyer pick a rate, and include the chosen rate payload in the `POST /api/checkout` request.
- `netlify/functions/getShippingQuoteBySkus.ts` (fas-sanity): accept `quoteKey`, cache `shipment.id`/`rates`, return cached results when the same key reappears, and log quote/context information for debugging.
- `src/pages/api/webhooks.ts` (fas-cms): read the new shipping metadata fields (`shipping_quote_id`, `shipping_shipment_id`, etc.), keep `easypostRateId` populated, and stash the quote reference in the Sanity order payload.
- `src/pages/api/create-shipping-label.ts` (fas-sanity): prioritize the saved `easyPostShipmentId`/`easypostRateId` when purchasing labels, avoid re-creating shipments, and log label purchases against the stored quote id.
- `packages/sanity-config/src/schemaTypes/documents/order.tsx` (shared package): ensure the schema exposes `easyPostShipmentId`, `shippingQuoteId`, and any new fields used by `create-shipping-label.ts` (if not already present) so Sanity can store the quote metadata.
- `packages/sanity-config/src/schemaTypes/documents/shippingQuote.ts` (shared package): add the cache document that records `quoteKey`, `quoteRequestId`, `rates`, `packages`, and the carrier shipment id so cached quotes can be reused safely.

## Cleanup list (run only after the new flow is stable)
- Disable or remove `estimateShippingForCart` / `buildShippingQuote` and the associated environment constants (`GROUND_*`, `FREIGHT_*`, defaults) so there is no parallel estimator in `src/pages/api/checkout.ts`.
- Remove the legacy `shippingQuoteMetadata` (`shipping_rate_label`, `shipping_rate_amount`, `shipping_rate_min_days`, etc.) once Stripe metadata is populated via the EasyPost rate fields.
- Delete any UI shipping quotes or fallback forms that still display the old calculated amount.
- Remove any cron/backfills that rely on the old flat quote (search for `buildShippingSummary` or `estimateShippingForCart` references).

## Backfill strategy
New fields such as `shippingQuoteId`/`easyPostShipmentId` only matter for checkouts after the change, so no immediate backfill is necessary. If you later need to run shipping label creation for historical orders, provide a radar script that copies `session.metadata.easypost_rate_id` into the order and flags it for manual label purchase.

## Rollback strategy
1. Spike a feature flag (env `SHIPPING_QUOTE_SOURCE=legacy` vs `sanity`) so you can flip back to the heuristic without code reverts.
2. If the live-rate path fails, set the flag to `legacy`, let `/api/checkout` fall back to `estimateShippingForCart`, and keep the old `shippingQuoteMetadata`. Document how the webhook expects that metadata so that `order` writes continue to function.
3. Once the new integration is fixed, remove the flag and re-deploy.

## Test plan
### Unit + automated
- `fas-cms`: cover the helper that builds the `getShippingQuoteBySkus` request payload and the code that converts the returned EasyPost rate into a Stripe `shipping_option` (ensure `amount`, `display_name`, `delivery_estimate`, and metadata fields are wired). Include tests for missing address and install-only cases.
- `fas-sanity`: add regression tests for `getShippingQuoteBySkus` to ensure the `quoteKey` cache works (requests with identical `quoteKey` should not trigger another `Shipment.create`). Mock EasyPost to confirm the cached `shipmentId` is returned.
- `fas-sanity`: verify the deterministic quote key helpers (hash generation and cart summary) and the `create-shipping-label` idempotent branch via lightweight `vitest` tests so we catch regressions in the caching/logging paths before a full integration run.
- `create-shipping-label.ts`: unit test using a mock order doc with `easyPostShipmentId` vs. no shipment id to ensure the label route either reuses the stored shipment or creates a new one exactly once.

### Integration
- Run checkout from the storefront end to end using a staging Stripe + EasyPost key: ensure `shipping_options` contains the EasyPost rate, complete payment, and confirm Sanity `order` doc stores `shippingQuoteId`, `easyPostShipmentId`, `carrier`, `service`, and `easypostRateId`.
- Trigger the shipping label endpoint for that order and verify only one EasyPost `Shipment` exists (no extra shipments created by quoting and label purchasing). Check that `stripe-shipping-webhook.ts` and `easypostWebhook.ts` still update `trackingNumber` and `shippingStatus`.
- Confirm `getShippingQuoteBySkus` respects the `quoteKey` cache by issuing two quote requests with identical payload: logs should show the second call served from the cache (no second `Shipment.create`).
- Validate that Stripe's line items + shipping total (via `session.total_details.amount_shipping`) equals the EasyPost rate amount (no double charges).

### Manual verification
- Use the staging checkout flow with a “heavy” product to verify freight detection, same as the existing estimator (freight logic still runs before handing off to EasyPost). Confirm the UI and Stripe show only the live rate.
- Adjust the cart, request a new quote (new `quoteKey`), and ensure a new shipment is created (logs show a distinct `quoteKey` and `shipmentId`).
- Visit the Sanity order document and confirm `shippingLog`/`shippingStatus` still honor EasyPost webhook updates after the new metadata is written.
- Try hitting the quote endpoint with a malformed address to make sure the user-facing form surfaces the EasyPost error message rather than creating the Stripe session.

## Observability / logging changes
- Log a per-request `quoteRequestId` (UUID) from the storefront when calling `getShippingQuoteBySkus`, and pass it through the proxy headers so both repos log the same value.
- `getShippingQuoteBySkus`: add logs for `quoteKey`, `cartSummary`, `destination`, `EasyPost shipmentId`, and whether the response is cached; surface errors with the EasyPost payload.
- `getShippingQuoteBySkus`: persist the quote data into the `shippingQuote` doc with `source` (`fresh` vs `cache`), `rateCount`, `cartSummary`, `createdAt`, and `expiresAt`, and return those fields alongside the cached rates so the storefront/Stripe metadata can explain its origin.
- `src/pages/api/checkout.ts`: log the chosen rate overview and add the `quoteRequestId` plus `quoteKey` to Stripe metadata (`shipping_quote_request_id`, `shipping_quote_key`) so `webhooks.ts` can correlate.
- Update `create-shipping-label.ts` to log `orderId`, `quoteId`, and `easyPostShipmentId` before `Shipment.buy` to avoid duplicate label purchases; if the label endpoint detects `labelPurchased`, short-circuit and log the event instead of re-calling EasyPost.
- Ensure EasyPost/Stripe webhooks continue to log their `eventLogId` (existing logic in `stripe-shipping-webhook.ts:200-260`) so retries can be correlated with the stored `quoteKey`.
