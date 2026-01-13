# Webhook Replay Test (Manual)

## Goal
Prove replay safety: the same Stripe session event does not create duplicate orders and does not overwrite canonical quote metadata.

## Steps
1) Complete a checkout in staging.
2) In Stripe Dashboard, locate the `checkout.session.completed` event for that purchase.
3) Copy the event payload JSON.
4) POST it twice to the storefront webhook endpoint (exact URL depends on your deploy).

Example (replace URL):
curl -X POST "https://<your-site>/.netlify/functions/stripeWebhook" \
  -H "Content-Type: application/json" \
  -d @event.json

Run the same command twice.

## Expected Result
- Only one order record exists in Sanity for the session.
- Fields are preserved:
  - shipping_quote_key
  - shipping_quote_request_id
  - shipping_quote_id
  - selected_rate_id
- No second order is created.

If you already have a local webhook testing method (Stripe CLI), this doc stays the same but your “POST” mechanism changes.
