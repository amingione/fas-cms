# Codex-Only Bootstrap Audit (fas-cms)

Issue: codex-only-bootstrap
Repo: fas-cms (consumer runtime + frontend logic)
Date: 2025-12-27

## Scope
- Inspect runtime boundaries (API routes, Stripe payload usage, Sanity fetch assumptions, customer/order linkage logic).
- Identify silent failure points.

## Sources inspected (read-only)
- src/pages/api/checkout.ts
- src/pages/api/webhooks.ts
- src/pages/api/** (route surface)
- src/server/sanity-client.ts
- src/server/sanity/quote-requests.ts
- src/server/sanity/order-cart.ts
- src/server/vendor-portal/data.ts
- src/lib/sanity.ts

## Runtime boundaries (fas-cms ownership)
- API routes under `src/pages/api/**` own inbound request validation, Stripe orchestration, and outbound responses.
- Stripe integration is defined in `src/pages/api/checkout.ts` and `src/pages/api/webhooks.ts`; this repo owns payload mapping and webhook processing.
- Sanity client instantiation and queries in `src/server/sanity-client.ts` and `src/server/**` are runtime boundaries and must not mutate schema authority.
- Order cart normalization is runtime logic in `src/server/sanity/order-cart.ts` and must track schema contracts without redefining them.

## Stripe payload usage observations
- Checkout session creation uses runtime-derived cart data and metadata for order creation.
- Webhook handling relies on session metadata (customer_email, order_type, marketing_opt_in) and Stripe line items; these are authoritative runtime inputs.
- Fallbacks exist for missing expanded session data and line items (e.g., retrieve failure falls back to listLineItems).

## Sanity fetch assumptions
- `src/server/sanity-client.ts` assumes schema fields exist (e.g., `portalAccess`, `customer`, `vendor`, `order` fields) and does not runtime-validate responses.
- Vendor portal queries in `src/server/vendor-portal/data.ts` assume field names and nested shapes from Sanity documents without defensive checks.
- `src/server/sanity/quote-requests.ts` constructs a `quoteRequest` document shape without validating against schema at runtime.

## Customer/order linkage logic
- Webhooks locate or create a `customer` document based on email, then set `customerRef` for orders; this is a critical runtime boundary between Stripe and Sanity.
- Linkage depends on metadata and Stripe customer details; missing or malformed values default to empty strings in several fields.

## Silent failure points / error masking
- `src/server/sanity/quote-requests.ts` returns `null` when the write token is missing or on create errors; upstream callers may treat this as success without explicit handling.
- Webhook expansion failures are logged but processing continues, potentially producing partial order data.
- `src/server/sanity/order-cart.ts` defaults missing or invalid numeric values (price -> 0, quantity -> 1), which can hide bad inputs.
- `src/server/sanity-client.ts` throws on missing project ID at module load; downstream may not catch this in route handlers.

## Audit outcome
- fas-cms is the runtime owner of API request handling, Stripe payload mapping, and Sanity fetch usage.
- Schema authority must remain in fas-sanity; fas-cms must only consume and validate against it.

## Next enforcement focus
- Add runtime validation at API boundaries and Stripe payload ingest points (without changing schema definitions).
- Enforce explicit handling for null/failed persistence paths when writing to Sanity.
