# Repo Map — fas-cms-fresh ↔ fas-sanity (Phase 0)

## fas-cms-fresh (Astro frontend)

- Root: `/Users/ambermin/LocalStorm/Workspace/DevProjects/GitHub/fas-cms-fresh`
- Sanity clients & helpers:
  - `src/lib/sanityClient.ts`
  - `src/lib/sanityServer.ts`
  - `src/lib/sanityFetch.ts`
  - `src/lib/sanity-utils.ts`
  - `src/server/sanity-client.ts`
- Query definitions:
  - `src/lib/storefrontQueries.ts`
  - `src/lib/queries.ts`
  - `src/lib/blogQueries.ts`
  - `src/lib/seoData.ts`
  - `src/lib/seoMetrics.ts`
  - `src/lib/sitemap.ts`
- Sanity writes / patches (selected):
  - `src/pages/api/webhooks.ts` (orders, customers, attribution, emailLog)
  - `src/pages/api/save-order.ts` (order)
  - `src/pages/api/orders/[id].ts` (order + customer + vendor)
  - `src/pages/api/customer/update.ts` (customer + vendor)
  - `src/pages/api/vendor/messages/*.ts` (vendorMessage)
  - `src/pages/api/vendor/returns/index.ts` (vendorReturn)
  - `src/pages/api/vendor/documents/upload.ts` (vendorDocument)
  - `src/pages/api/vendor/invoices/[id]/pay.ts` (invoice + vendorNotification)
  - `src/pages/api/reviews/submit.ts` (review)
  - `src/pages/api/wheel-quote-*.ts` (wheelQuote, emailLog)
  - `src/pages/api/build-quote.ts` (quoteRequest)
  - `src/pages/api/save-quote.ts` (buildQuote)
  - `src/pages/api/cart.ts` (cartItem)
  - `src/pages/api/attribution/track.ts` (attribution)
  - `src/pages/api/contact.ts` (emailLog)
  - `src/pages/api/form-submission.ts` (marketingOptIn)
  - `src/server/vendor-application-handler.ts` (vendorApplication)
  - `src/lib/emailService.ts` (vendorEmailLog)
- Sanity queries embedded in pages:
  - `src/pages/shop/*`, `src/pages/vendors/*`, `src/pages/blog/*`, `src/pages/vendor-portal/*`, `src/pages/dashboard/order/[id].astro`, `src/pages/resources/employee-sms-consent.astro`
- Local studio config & schemas (subset):
  - `packages/sanity-config/sanity.config.ts`
  - `sanity/schemaTypes.ts` and `sanity/schemas/*`
  - `sanity/components/SetPasswordAction.tsx`

## fas-sanity (schema surface only)

- Root: `/Users/ambermin/LocalStorm/Workspace/DevProjects/GitHub/fas-sanity`
- Schema sources:
  - `packages/sanity-config/src/schemaTypes/documents/*`
  - `packages/sanity-config/src/schemaTypes/objects/*`
  - `packages/sanity-config/schema.json` (compiled schema)

## Key Sanity Schemas Referenced by fas-cms-fresh

(Locations are in fas-sanity unless noted.)

- `product`: `packages/sanity-config/src/schemaTypes/documents/product.ts`
- `category`: `packages/sanity-config/src/schemaTypes/documents/category.ts`
- `filterTag`: `packages/sanity-config/src/schemaTypes/documents/filterTag.ts`
- `collection`: `packages/sanity-config/src/schemaTypes/documents/collection.tsx`
- `vendor`: `packages/sanity-config/src/schemaTypes/documents/vendor.ts`
- `customer`: `packages/sanity-config/src/schemaTypes/documents/customer.ts`
- `order`: `packages/sanity-config/src/schemaTypes/documents/order.tsx`
- `invoice`: `packages/sanity-config/src/schemaTypes/documents/invoice.ts`
- `quote`: `packages/sanity-config/src/schemaTypes/documents/quote.ts`
- `quoteRequest`: `packages/sanity-config/src/schemaTypes/documents/quoteRequest.ts`
- `promotion`: `packages/sanity-config/src/schemaTypes/documents/promotion.ts`
- `vendorMessage`: `packages/sanity-config/src/schemaTypes/documents/vendorMessage.ts`
- `vendorNotification`: `packages/sanity-config/src/schemaTypes/documents/vendorNotification.ts`
- `vendorReturn`: `packages/sanity-config/src/schemaTypes/documents/vendorReturn.ts`
- `vendorDocument`: `packages/sanity-config/src/schemaTypes/documents/vendorDocument.ts`
- `vendorAuthToken`: `packages/sanity-config/src/schemaTypes/documents/vendorAuthToken.ts`
- `vendorApplication`: `packages/sanity-config/src/schemaTypes/documents/vendorApplication.ts`
- `vendorPost`: `packages/sanity-config/src/schemaTypes/documents/vendorPost.ts`
- `emailCampaign`: `packages/sanity-config/src/schemaTypes/documents/emailCampaign.ts`
- `emailLog`: `packages/sanity-config/src/schemaTypes/documents/emailLog.ts`
- `vendorEmailLog`: `packages/sanity-config/src/schemaTypes/documents/vendorEmailLog.ts`
- `marketingOptIn`: `packages/sanity-config/src/schemaTypes/documents/marketingOptIn.ts`
- `attribution`: `packages/sanity-config/src/schemaTypes/documents/attribution.ts`
- `wheelQuote`: `packages/sanity-config/src/schemaTypes/documents/wheelQuote.ts`
- `downloadResource`: `packages/sanity-config/src/schemaTypes/documents/downloadResource.ts`
- `vehicleModel`: `packages/sanity-config/src/schemaTypes/documents/vehicleModel.ts`
- `tune`: `packages/sanity-config/src/schemaTypes/documents/tune.ts`
- `service`: `packages/sanity-config/src/schemaTypes/documents/service.ts`
- `bill`: `packages/sanity-config/src/schemaTypes/documents/bill.tsx`
- `purchaseOrder`: `packages/sanity-config/src/schemaTypes/documents/purchaseOrder.ts`
- `vendorProduct`: `packages/sanity-config/src/schemaTypes/documents/vendorProduct.ts`
- `post`: `packages/sanity-config/src/schemaTypes/documents/blog/blogPost.ts`
- `blogCategory`: `packages/sanity-config/src/schemaTypes/documents/blog/blogCategory.ts`
- `globalSeoSettings`: `packages/sanity-config/src/schemaTypes/singletons/*` (see schema.json)
- `seoMetrics`: `packages/sanity-config/src/schemaTypes/documents/*` (see schema.json)

Local schema subset in fas-cms-fresh:

- `sanity/schemas/customer.ts`
- `sanity/schemas/vendor.ts`
- `sanity/schemas/vendorAuthToken.ts`
- `sanity/schemas/vendorMessage.ts`
- `sanity/schemas/vendorNotification.ts`
- `sanity/schemas/vendorDocument.ts`
- `sanity/schemas/vendorReturn.ts`
- `sanity/schemas/quoteRequest.ts`
- `sanity/schemas/emailCampaign.ts`
- `sanity/schemas/marketingOptIn.ts`

## Key API Routes (fas-cms-fresh)

- Checkout + Stripe webhook: `src/pages/api/checkout.ts`, `src/pages/api/webhooks.ts`
- Orders: `src/pages/api/save-order.ts`, `src/pages/api/orders/[id].ts`, `src/pages/api/get-user-order.ts`, `src/pages/api/admin/orders/*`
- Customers: `src/pages/api/customer/get.ts`, `src/pages/api/customer/update.ts`, `src/pages/api/get-customer-profile.ts`
- Vendor portal: `src/pages/api/vendor/*`, `src/server/vendor-portal/*`
- Promotions & reviews: `src/pages/api/promotions/*`, `src/pages/api/reviews/*`
- Quotes: `src/pages/api/save-quote.ts`, `src/pages/api/build-quote.ts`, `src/pages/api/wheel-quote-*.ts`
- Content & search: `src/pages/api/products/*`, `src/pages/api/collections/*`, `src/pages/api/search.ts`, `src/pages/api/sanity/categories.ts`
- Marketing/email: `src/pages/api/contact.ts`, `src/pages/api/form-submission.ts`, `src/pages/api/attribution/track.ts`
- Appointments: `src/pages/api/get-user-appointments.ts`, `src/pages/api/bookings/create.ts`

## Integrations Observed

- Stripe: `src/pages/api/checkout.ts`, `src/pages/api/webhooks.ts`, `src/pages/api/vendor/invoices/[id]/pay.ts`, `src/pages/api/save-order.ts`
- Email (Resend): `src/lib/emailService.ts`, `src/pages/api/contact.ts`, `src/pages/api/form-submission.ts`, `src/pages/api/webhooks.ts`, `src/pages/api/wheel-quote-*.ts`, `src/lib/vendorPostNotifications.ts`, `src/server/vendor-portal/email.ts`
- EasyPost: fields referenced in `src/pages/api/checkout.ts` + `src/pages/api/webhooks.ts` (rate IDs, carrier/service metadata)
