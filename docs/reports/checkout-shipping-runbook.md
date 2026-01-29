# Checkout Shipping Runbook

## Required environment variables
- `SANITY_FUNCTIONS_BASE_URL` – full origin of the fas-sanity deployment so `fas-cms-fresh` can call `getShippingQuoteBySkus`.
- `SHIPPING_QUOTE_CACHE_TTL_SECONDS` – how long the Sanity `shippingQuote` doc is considered fresh (default 1800s).
- Stripe credentials (`STRIPE_SECRET_KEY`, `STRIPE_API_VERSION`, optional `STRIPE_WEBHOOK_SECRET`) for creating checkout sessions and validating webhooks.
- `SHIPPO_API_KEY` and `SHIPPO_WEBHOOK_SECRET` (fas-sanity) to perform carrier rating/labeling.

## Testing the quote endpoint
1. Craft a payload that mirrors the storefront request, including `cart` items and a normalized `destination` address plus a deterministic `quoteKey`/`quoteRequestId`:
   ```bash
   curl -sSf -X POST \
     -H 'Content-Type: application/json' \
     -d '{"cart":[{"sku":"EXAMPLE-SKU","quantity":1}],"destination":{"addressLine1":"123 Main St","city":"Orlando","state":"FL","postalCode":"32801","country":"US"},"quoteKey":"<hash>","quoteRequestId":"<uuid>"}' \
     https://<sanity-base>/.netlify/functions/getShippingQuoteBySkus
   ```
2. Confirm the response includes `rates`, `quoteKey`, `shippingQuoteId`, and `shippoShipmentId`, plus the `source` (`fresh` vs `cache`), `rateCount`, `cartSummary`, and the `createdAt`/`expiresAt` timestamps. Re-run with the same `quoteKey` and ensure the payload now reports `source: "cache"` (no new Shippo Shipment created).
3. Verify a new Sanity document `_type == "shippingQuote"` exists for that key, contains the rates array, packages, `source`, `rateCount`, and `expiresAt`, and that `expiresAt` aligns with `SHIPPING_QUOTE_CACHE_TTL_SECONDS` if set.

## Testing Stripe checkout shipping options
1. Hit `https://<fas-cms-base>/api/checkout` with the same cart + shipping destination. The response should include a `url` and the server log should show the quote metadata.
2. Open the returned Stripe Checkout `url` and confirm the shipping options list the live carrier rates (carrier name + delivery estimate). Stripe should charge the selected option.
3. After completing payment in test mode, fetch the Stripe session via the Dashboard/CLI and ensure `session.shipping_rate` metadata (`selected_rate_id`, `shipping_quote_key`, `easy_post_shipment_id`) is populated.

## Testing webhook persistence
1. Use the Stripe CLI to forward `checkout.session.completed` events to `/api/webhooks`: `stripe listen --forward-to localhost:3000/api/webhooks` then make a payment.
2. Inspect the resulting Sanity `order` document and confirm it contains the new fields: `shippingQuoteId`, `shippingQuoteKey`, `shippingQuoteRequestId`, `shippoShipmentId`, `shippoRateId`, `carrier`, `service`, and shipping totals that match Stripe’s `amount_shipping`.
3. Check that `shippingLog`/`shippingStatus` are unaffected and that no duplicate orders are created if the webhook retries.

## Testing label purchase idempotency
1. Call `POST /.netlify/functions/create-shipping-label` with the order ID from the completed checkout; ensure a label is created once (`labelPurchased`, `trackingNumber`, `shippingLabelUrl` populate).
2. Call the same endpoint again for the same order: the response should return the existing label data (`trackingNumber`, `labelUrl`, `message: 'Label already purchased'`) without creating a second Shippo shipment.
3. Review the Shippo dashboard to confirm only one shipment exists for that order.

## Additional validation
- After changing the cart or destination, ensure the system generates a new `quoteKey`, a new `shippingQuote` doc, and a distinct Shippo Shipment.
- Keep an eye on the `shippingQuote` cache TTL; if a quote is older than `SHIPPING_QUOTE_CACHE_TTL_SECONDS`, the handler should refresh it and update the cached document.
