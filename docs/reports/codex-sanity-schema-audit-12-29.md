# Phase 0 — Sanity Schema Discovery Audit (fas-cms-fresh)

This report inventories Sanity dependencies in `fas-cms-fresh` and maps them to the `fas-sanity` schema surface (schema sources and compiled schema JSON). It is read-only and observational.

## Repos & Schema Sources Observed

- fas-cms-fresh root: `/Users/ambermin/LocalStorm/Workspace/DevProjects/GitHub/fas-cms-fresh`
- fas-sanity root: `/Users/ambermin/LocalStorm/Workspace/DevProjects/GitHub/fas-sanity`
- fas-sanity schema sources:
  - `packages/sanity-config/src/schemaTypes/documents/*`
  - `packages/sanity-config/src/schemaTypes/objects/*`
  - `packages/sanity-config/schema.json` (compiled schema)

## Sanity Client Configuration & Query Helpers (fas-cms-fresh)

- `src/lib/sanityClient.ts`
  - `createClient({ apiVersion: '2024-01-01', useCdn: false, token })`
  - `fetchFromSanity(query, params)`
  - `fetchProducts()` query projection includes: `_id, title, slug, price, onSale, salePrice, compareAtPrice, discountPercent, discountPercentage, saleStartDate, saleEndDate, saleActive, saleLabel, images[]{ asset->{ url } }`
- `src/lib/sanityServer.ts`
  - `createClient({ apiVersion: '2024-01-01', useCdn: !token })`
- `src/lib/sanityFetch.ts`
  - `createClient({ apiVersion: '2024-01-01', useCdn: true })` with configurable `perspective`/`stega`
- `src/server/sanity-client.ts`
  - `createClient({ apiVersion: '2024-01-01', useCdn: !token })`
  - Helper methods use GROQ queries listed below
- `src/lib/sanity-utils.ts`
  - Defines query filters and projections (PRODUCT_LISTING_PROJECTION, etc.)

## Sanity Schema Types Referenced in fas-cms-fresh

(Types referenced by GROQ `_type` filters or `_type` writes.)

- `product` → `packages/sanity-config/src/schemaTypes/documents/product.ts`
- `category` → `packages/sanity-config/src/schemaTypes/documents/category.ts`
- `collection` → `packages/sanity-config/src/schemaTypes/documents/collection.tsx`
- `vendor` → `packages/sanity-config/src/schemaTypes/documents/vendor.ts`
- `customer` → `packages/sanity-config/src/schemaTypes/documents/customer.ts`
- `order` → `packages/sanity-config/src/schemaTypes/documents/order.tsx`
- `invoice` → `packages/sanity-config/src/schemaTypes/documents/invoice.ts`
- `quote` → `packages/sanity-config/src/schemaTypes/documents/quote.ts`
- `quoteRequest` → `packages/sanity-config/src/schemaTypes/documents/quoteRequest.ts`
- `promotion` → `packages/sanity-config/src/schemaTypes/documents/promotion.ts`
- `vendorMessage` → `packages/sanity-config/src/schemaTypes/documents/vendorMessage.ts`
- `vendorNotification` → `packages/sanity-config/src/schemaTypes/documents/vendorNotification.ts`
- `vendorReturn` → `packages/sanity-config/src/schemaTypes/documents/vendorReturn.ts`
- `vendorDocument` → `packages/sanity-config/src/schemaTypes/documents/vendorDocument.ts`
- `vendorAuthToken` → `packages/sanity-config/src/schemaTypes/documents/vendorAuthToken.ts`
- `vendorApplication` → `packages/sanity-config/src/schemaTypes/documents/vendorApplication.ts`
- `vendorPost` → `packages/sanity-config/src/schemaTypes/documents/vendorPost.ts`
- `emailCampaign` → `packages/sanity-config/src/schemaTypes/documents/emailCampaign.ts`
- `emailLog` → `packages/sanity-config/src/schemaTypes/documents/emailLog.ts`
- `vendorEmailLog` → `packages/sanity-config/src/schemaTypes/documents/vendorEmailLog.ts`
- `marketingOptIn` → `packages/sanity-config/src/schemaTypes/documents/marketingOptIn.ts`
- `attribution` → `packages/sanity-config/src/schemaTypes/documents/attribution.ts`
- `wheelQuote` → `packages/sanity-config/src/schemaTypes/documents/wheelQuote.ts`
- `downloadResource` → `packages/sanity-config/src/schemaTypes/documents/downloadResource.ts`
- `vehicleModel` → `packages/sanity-config/src/schemaTypes/documents/vehicleModel.ts`
- `tune` → `packages/sanity-config/src/schemaTypes/documents/tune.ts`
- `service` → `packages/sanity-config/src/schemaTypes/documents/service.ts`
- `bill` → `packages/sanity-config/src/schemaTypes/documents/bill.tsx`
- `purchaseOrder` → `packages/sanity-config/src/schemaTypes/documents/purchaseOrder.ts`
- `vendorProduct` → `packages/sanity-config/src/schemaTypes/documents/vendorProduct.ts`
- `post` → `packages/sanity-config/src/schemaTypes/documents/blog/blogPost.ts`
- `blogCategory` → `packages/sanity-config/src/schemaTypes/documents/blog/blogCategory.ts`
- `globalSeoSettings` → observed in `src/lib/seoData.ts` query (schema source not located in documents list; see schema.json)
- `seoMetrics` → observed in `src/lib/seoMetrics.ts` query (schema source not located in documents list; see schema.json)

## GROQ Queries & Sanity Reads (fas-cms-fresh)

### Query Definitions (centralized)

- `src/lib/storefrontQueries.ts`
  - `productDetailQuery`: fields `_id, title, slug, description, images, pricing.*, inventory.*, hasVariants, variantOptions[], variants[], shippingConfig, metaTitle, metaDescription`
  - `productListingQuery`: fields `_id, title, displayTitle, slug, images[0], pricing.*, inventory.*, hasVariants, variantCount`
  - `inventoryCheckQuery`: fields `_id, inventory.sku, inventory.trackInventory, inventory.quantityAvailable, inventory.quantityReserved, inventory.quantityInStock, inventory.allowBackorder, hasVariants, variants[]`
  - `activeSalesQuery`: fields `_id, title, displayTitle, slug, images[0], pricing.*`
  - `orderTrackingQuery`: fields `_id, orderNumber, status, createdAt, totalAmount, cart[], shippingAddress, fulfillment.*`
  - `activePromotionsQuery`: fields `_id, title, code, displayName, description, promotionType, discountType, discountValue, appliesTo, minimumRequirements.*, schedule.*, marketing.*, usageLimits.*`
  - `validatePromotionQuery`: fields `_id, title, code, promotionType, discountType, discountValue, appliesTo, eligibleProducts[]->_id, eligibleCategories[]->_id, eligibleCollections[]->_id, minimumRequirements, customerEligibility, usageLimits, combinability, isValid`
  - `promotionLandingQuery`: fields `_id, title, displayName, description, code, discountType, discountValue, schedule.*, marketing.*, appliesTo, eligibleProducts[]->{_id, title, displayTitle, slug, images, pricing}`
  - `productReviewsQuery`: fields `_id, rating, title, content, customerName, verifiedPurchase, submittedAt, images[]{asset->url, metadata.dimensions}, pros, cons, helpful.*, response, featured`
  - `productReviewSummaryQuery`: fields `reviews.averageRating, reviews.totalReviews, reviews.ratingDistribution, reviews.recommendationPercentage`
  - `collectionWithProductsQuery`: fields `_id, title, description, collectionType, featuredImage, seo, productCount, automaticRules, manualProducts[]->...`
  - `collectionsForNavQuery`: fields `_id, title, slug, description, featuredImage, productCount, featured`
  - `featuredCollectionsQuery`: fields `_id, title, slug, description, featuredImage, productCount, previewProducts[]->...`

- `src/lib/queries.ts`
  - `activeVendorsQuery`: fields `_id, vendorNumber, companyName, displayName, slug, logo, description, website, businessType, featured, tags, socialMedia, productCount`
  - `featuredVendorsQuery`: fields `_id, companyName, displayName, slug, logo, description, website, businessType, productCount`
  - `vendorBySlugQuery`: fields `_id, vendorNumber, companyName, displayName, slug, logo, description, website, businessType, featured, tags, socialMedia, products[]->{_id, title, slug, price, onSale, salePrice, compareAtPrice, discountPercent, discountPercentage, saleStartDate, saleEndDate, saleLabel, sku}`

- `src/lib/blogQueries.ts`
  - `publishedPostsQuery`: fields `_id, _createdAt, _updatedAt, title, slug, excerpt, featuredImage, publishedAt, readTime, featured, author->{_id,name,email,avatar}, categories[]->{_id,title,slug,color}, tags`
  - `postBySlugQuery`: fields `_id, _createdAt, _updatedAt, title, slug, excerpt, featuredImage, content, publishedAt, readTime, status, author->{...}, categories[]->{...}, tags, seo, relatedProducts[]->{_id,title,slug,price}, relatedPosts[]->{_id,title,slug,excerpt,featuredImage,publishedAt}`
  - `featuredPostsQuery`: fields `_id, title, slug, excerpt, featuredImage, publishedAt, author->{name,avatar}, categories[]->{title,color}`
  - `blogCategoriesQuery`: fields `_id, title, slug, description, color, postCount`

- `src/lib/sanity-utils.ts`
  - `PRODUCT_LISTING_PROJECTION` includes: `_id, title, displayTitle, slug, metaTitle, metaDescription, price, onSale, salePrice, compareAtPrice, discountPercent, discountPercentage, saleStartDate, saleEndDate, saleLabel, saleActive, finalPrice, averageHorsepower, description, shortDescription, importantNotes, brand, gtin, mpn, canonicalUrl, noindex, socialImage{asset->{_id,url},alt}, specifications, attributes, includedInKit[]{item,quantity,notes}, productType, requiresPaintCode, featured, status, images[]{asset->{_id,url,metadata.dimensions},alt}, tune->{title,slug}, compatibleVehicles[]->{make,model,slug}, tags, filters[]->{_id,title,slug}, options/optionGroups/variationOptions (normalized values), variations, addOns[]{label,priceDelta,description,skuSuffix,defaultSelected,group,key,name,title,value,price,delta}, customPaint{enabled,additionalPrice,paintCodeRequired,codeLabel,instructions}, categories[]/category[]->{_id,title,slug}`
  - `fetchProductsFromSanity` query uses ACTIVE_PRODUCT_WITH_SLUG_FILTER and `PRODUCT_LISTING_PROJECTION`
  - `fetchFilteredProducts` query uses filters: categories/categories.slug, filters, compatibleVehicles.slug, price expressions, tags; projection `PRODUCT_LISTING_PROJECTION`
  - `getProductCount` query mirrors `fetchFilteredProducts` filters
  - `fetchStorefrontFilterFacets` query returns `filters[]`, `filterTitles`, sale fields
  - `fetchActiveSaleProducts` query uses pricing fields and `PRODUCT_LISTING_PROJECTION`
  - `fetchServiceCatalogProducts`, `fetchFeaturedProducts`, `fetchCategories`, `fetchTunes`, `fetchVehicles`, `getProductBySlug`, `getRelatedProducts`, `getUpsellProducts`

- `src/lib/seoData.ts`
  - Query uses `_type == "globalSeoSettings"` and a generic page selector by `seo.slug.current` or `slug.current`
  - Fields: `seo.title`, `seo.description`, `seo.canonicalUrl`, `seo.keywords`, `seo.noindex`, `seo.ogImage`, `seo.jsonLd`, `seo.breadcrumbs`, `seo.relatedLinks`, `relatedPages`, `relatedProducts`, `relatedArticles`, `relatedServices`, plus base `title`, `description`, `canonicalUrl`, `keywords`

- `src/lib/seoMetrics.ts`
  - Query: `*[_type == "seoMetrics"] | order(_updatedAt desc)[0]{ metrics[] | order(date desc)[0...$limit] }`

- `src/lib/sitemap.ts`
  - Product slugs query fields: `slug.current`, `_updatedAt`, `_createdAt`
  - Category slugs query fields: `slug.current`, `_updatedAt`, `_createdAt`

- `src/lib/customer.ts`
  - Customer query fields: `_id, fullName, email, phone, billingAddress, shippingAddress, stripeCustomerId, vehicle, notes, quotes[]->{_id,title,total,status}, _createdAt`

- `src/lib/vendorPostNotifications.ts`
  - Vendor post fields: `title, excerpt, slug, postType`
  - Vendor fields: `companyName, portalAccess.email` with `portalAccess.enabled` and `portalAccess.notificationPreferences.emailUpdates`

- `src/lib/emailService.ts`
  - Email campaign query fields: `_id, emails[emailNumber==1][0]{subject,htmlContent}`
  - Vendor fields: `companyName, portalAccess.email`

- `src/server/sanity/promotions.ts`
  - Promotion query fields: `_id, title, code, promotionType, discountType, discountValue, appliesTo, eligibleProducts[]->_id, eligibleCategories[]->_id, eligibleCollections[]->_id, minimumRequirements, customerEligibility, usageLimits, combinability, schedule`
  - Order count query: `_type == "order" && references($customerId) && paymentStatus == "paid"`
  - Patch fields: `usageLimits.currentUsageCount`, `performance.totalUses`, `performance.totalRevenue`, `performance.totalDiscount`, `performance.averageOrderValue`

- `src/server/sanity/collections.ts`
  - `collection` doc fields: `collectionType`, `manualProducts[]`, `automaticRules`
  - `product` query fields: `_id, title, displayTitle, slug, images[0], pricing, inventory, reviews, pricing.price`

- `src/server/sanity/reviews.ts`
  - Reviews query fields: `rating, submittedAt`
  - Patch fields on product: `reviews.averageRating`, `reviews.totalReviews`, `reviews.ratingDistribution`, `reviews.recommendationPercentage`, `reviews.lastReviewedAt`

- `src/server/sanity/quote-requests.ts`
  - Creates `quoteRequest` with fields: `submittedAt, source, status, customerName, customerEmail, customerPhone, vehicle, summary, subtotal, notes, items[]{_type:'quoteItem', name, quantity, price, total, notes}, linkedQuote (reference), meta`

- `src/server/sanity-client.ts`
  - Vendor lookup: `portalAccess.email`, `primaryContact.email`, `accountingContact.email`, `portalAccess.userSub`, `portalAccess.permissions`
  - Vendor order summary: `.orders[]{orderId,status,amount,createdAt}`
  - Orders list: `{..., customer->{name,email}, vendor->{name,email}}`

### API Routes (inline queries)

- `src/pages/api/checkout.ts`
  - Product fetch for cart IDs/SKUs: `_id, title, sku, price/pricing, onSale, salePrice, compareAtPrice, discountPercent, discountPercentage, saleStartDate, saleEndDate, saleLabel, saleActive, shippingWeight, boxDimensions, shippingClass, shipsAlone, shippingConfig{weight, dimensions, shippingClass, requiresShipping, separateShipment}`
- `src/pages/api/webhooks.ts`
  - Customer lookup: `_type=="customer" && lower(email)==lower($email)`
  - Order fetch for email: `*[_id==$id][0]{orderNumber,customerName,createdAt,amountSubtotal,amountTax,amountShipping,totalAmount}`
  - Order lookup for refunds: `*[_type == "order" && stripePaymentIntentId == $paymentIntentId]`
- `src/pages/api/save-order.ts`
  - Customer lookup: `*[_type == "customer" && email == $email][0]`
- `src/pages/api/orders/[id].ts`
  - Order lookup by customer email: `*[_type == "order" && _id == $id && customerRef->email == $email][0]`
  - CustomerRef lookup for order: `*[_type == "order" && _id == $id][0]{customerRef}`
  - Vendor lookup by customerRef: `*[_type == "vendor" && customerRef._ref == $customerId][0]{_id}`
- `src/pages/api/get-user-order.ts`
  - Product lookup by ids/slugs/sku/title; fields: `_id, title, sku, slug.current, imageUrl` (coalesced from `image`, `images`, `mainImage`, `thumbnail`, `thumb`)
  - Orders by customer email: fields `_id, orderNumber, status, paymentStatus, orderType, totalAmount, amountSubtotal, amountTax, amountShipping, createdAt, carrier, service, trackingNumber, trackingUrl, shippingAddress, billingAddress, cart, customerName, customerEmail`
- `src/pages/api/get-user-invoices.ts`
  - Invoice query by customer email; fields include `invoiceNumber, status, paymentIntentId, stripeSessionId, total/amount, subtotal, taxRate, taxAmount, discountType, discountValue, date/dateIssued, dueDate, paymentLinkUrl, invoicePdfUrl, quotePdfUrl, receiptUrl, lastEmailedAt, customer/customerRef, orderRef, lineItems[]{...}`
- `src/pages/api/get-user-quotes.ts`
  - Quote query by customer email; fields include `quoteNumber, status, subtotal, discountType, discountValue, taxRate, taxAmount, total, notes, quotePdfUrl, lastEmailedAt, billTo, shipTo, customer, timeline, lineItems[]{...}`
- `src/pages/api/get-customer-profile.ts`
  - Customer lookup by `userId` then `email`
- `src/pages/api/get-user-appointments.ts`
  - Booking query: `*[_type == "booking" && customerRef->email == $email]{ bookingId, status, service, scheduledAt, notes, customer->{...} }`
- `src/pages/api/customer/update.ts`
  - Customer lookup by `userId` or `email`
  - Vendor lookup by `customerRef`
- `src/pages/api/customer/get.ts`
  - Customer lookup by `email`
- `src/pages/api/vendor/dashboard.ts`
  - Vendor lookup: `{customerRef, name, displayName, companyName, portalAccess}`
  - Order stats: wholesale orders by `customerRef._ref`
- `src/pages/api/vendor/notifications/index.ts`
  - VendorNotification list by `vendor._ref`
- `src/pages/api/vendor/notifications/unread-count.ts`
  - VendorNotification count by `vendor._ref` and `read != true`
- `src/pages/api/vendor/orders/[id].ts`
  - Vendor lookup: `{customerRef}`
  - Order detail for wholesale: fields include `statusHistory`, `cart[].productRef->{_id,title,sku,image}`
- `src/pages/api/vendor/returns/index.ts`
  - VendorReturn list fields: `rmaNumber, status, reason, createdAt, refundAmount, order->{poNumber}`
- `src/pages/api/vendor/invoices/[id].ts`
  - Invoice detail fields: `invoiceNumber, status, invoiceDate, dueDate, total, amountPaid, amountDue, customerRef->{companyName}, lineItems[], payments[]`
- `src/pages/api/vendor/invoices/[id]/pay.ts`
  - Invoice lookup by `_id` and `references($vendorId)`
- `src/pages/api/vendor/messages/index.ts`
  - VendorMessage list fields: `subject, status, priority, category, createdAt, lastReplyAt, replies[-1], replyCount`
- `src/pages/api/vendor/messages/[id].ts`
  - VendorMessage detail fields: `subject, status, priority, category, relatedOrder, relatedInvoice, attachments, replies[], createdAt`
- `src/pages/api/vendor/settings/*`
  - Vendor profile fields: `companyName, portalAccess, primaryContact`
  - Vendor notification prefs: `notificationPreferences`
  - Vendor addresses: `shippingAddresses`
- `src/pages/api/vendor/auth/setup.ts`
  - Vendor lookup by `portalAccess.setupToken`, `setupTokenExpiry`, `setupCompletedAt`
- `src/pages/api/vendor/blog.ts`
  - VendorPost list fields: `title, slug, postType, priority, excerpt, featuredImage.asset.url, publishedAt, pinned, author->{name}`
- `src/pages/api/vendor/me.ts`
  - Vendor lookup by `portalAccess.userSub`
- `src/pages/api/products/[slug].ts`
  - Product fields: `_id, title, displayTitle, slug, price, onSale, salePrice, compareAtPrice, discountPercent, discountPercentage, saleStartDate, saleEndDate, saleActive, saleLabel, description, images[]{asset->url}`
- `src/pages/api/products/[productId]/reviews.ts`
  - Uses `productReviewsQuery` from `src/lib/storefrontQueries.ts`
- `src/pages/api/search.ts`
  - Search across `_type in ["product","service","quote","invoice","appointment"]` with fields `_id, _type, name, title, description, price, images, mainImage, thumbnail, slug.current`
- `src/pages/api/collections/*`
  - Uses `collectionWithProductsQuery`, `collectionsForNavQuery`, `featuredCollectionsQuery`
- `src/pages/api/promotions/*`
  - Uses `activePromotionsQuery`, `validatePromotionQuery`, `promotionLandingQuery`
- `src/pages/api/reviews/submit.ts`
  - Review lookup by `references(customerId)` and `references(productId)`
- `src/pages/api/wheel-quotes.ts`
  - WheelQuote list fields: `_id, source, createdAt, fullname, email, phone, series, diameter, width, boltPattern, backspacing, finish, beadlock, status`
- `src/pages/api/vehicles.ts`
  - VehicleModel query: `{ model }`
- `src/pages/api/tunes.ts`
  - Tune query: `{ title }`
- `src/pages/api/sanity/categories.ts`
  - Category query: `{ _id, title, slug.current }`
- `src/pages/api/bookings/create.ts`
  - Creates `booking` (fields: `customer`, `bookingDate`, `service`, `status`, `notes`)
- `src/pages/api/cart.ts`
  - Product `_type` validation: `*[_id == "${productId}"][0]{_type}`

### Pages (.astro) with inline queries

- `src/pages/shop/categories.astro`
  - Categories query: `_id, title, slug.current, image.asset->url, description`
- `src/pages/shop/categories/[category].astro`
  - Category lookup: `_id, title, description`
  - Product listing fields: `_id, title, displayTitle, slug.current, image, price, sale fields, excerpt, primaryKeyword, fitmentYears, fitment, seo.*`
- `src/pages/shop/filters/[filters].astro`
  - Filter lookup: `_id, title, description`
  - Product listing fields: same as categories page
- `src/pages/shop/sale/[tags].astro`
  - Sale products fields: `_id, title, displayTitle, slug, price, sale fields, pricing.*, tags, images, shortDescription, promotionTagline, featured`
- `src/pages/shop/storefront.astro`
  - Categories query: `_id, title, slug.current, imageUrl, description`
- `src/pages/sales/cyberMonday.astro`
  - Sale products fields: `_id, title, displayTitle, slug, price, sale fields, pricing.*, tags, images, shortDescription, promotionTagline, featured`
- `src/pages/vendor-portal/catalog.astro`
  - Wholesale catalog query fields: `_id, title, slug.current, sku, pricing.*, mainImage, shortDescription, availability`
- `src/pages/vendor-portal/blog/index.astro` and `src/pages/api/vendor/blog.ts`
  - VendorPost list fields: `title, slug, postType, priority, excerpt, featuredImage, publishedAt, pinned, author`
- `src/pages/vendor-portal/blog/[slug].astro`
  - VendorPost detail fields: `title, postType, priority, excerpt, featuredImage, content, relatedProducts, attachments, author, publishedAt`
- `src/pages/vendor-portal/setup.astro`
  - Vendor lookup by `portalAccess.setupToken` with `portalAccess` and contact fields
- `src/pages/resources/employee-sms-consent.astro`
  - DownloadResource fields: `title, content, description, category, accessLevel, formUrl, externalUrl`
- `src/pages/dashboard/order/[id].astro`
  - Order detail fields include `orderNumber, status, paymentStatus, amounts, tracking fields, shippingAddress, cardBrand, cardLast4, receiptUrl, customerEmail, customerRef/customer, shippingLog, cart[], invoiceRef`

### Pages using query helpers

- `src/pages/vendors/index.astro` → `activeVendorsQuery`, `featuredVendorsQuery`
- `src/pages/vendors/[slug].astro` → `vendorBySlugQuery`
- `src/pages/blog/index.astro` → blog queries
- `src/pages/blog/[slug].astro` → `postBySlugQuery`
- `src/pages/shop/index.astro` and `src/pages/shop/performance-packages/index.astro` → `fetchFilteredProducts`, `fetchStorefrontFilterFacets`, `getProductCount`, `fetchCategories`, `fetchVehicles`
- `src/pages/shop/[slug].astro` → `getProductBySlug`, `getRelatedProducts`, `getUpsellProducts`
- `src/pages/index.astro` → `fetchFeaturedProducts`
- `src/pages/press-media.astro` → `fetchProductsFromSanity`
- `src/pages/blackFridaySale.astro` → `fetchActiveSaleProducts`
- `src/pages/search.astro` → `fetchProductsFromSanity`

## Sanity Writes & Patches (fas-cms-fresh)

### Order & Checkout

- `src/pages/api/webhooks.ts`
  - Creates `customer` with fields: `email, name, marketingOptIn, emailOptIn, emailMarketing{subscribed,subscribedAt,source}`
  - Patches `customer`: `marketingOptIn, emailOptIn, emailMarketing.subscribed, emailMarketing.subscribedAt, emailMarketing.source`
  - Creates `order` with fields: `orderNumber, stripeSessionId, paymentIntentId, stripePaymentIntentId, paymentStatus, chargeId, cardBrand, cardLast4, receiptUrl, currency, amountSubtotal, amountTax, amountShipping, amountDiscount, totalAmount, customerRef, customerName, customerEmail, cart, status, createdAt, orderType, carrier, service, easypostRateId, shippingAddress, billingAddress, paymentCaptured, paymentCapturedAt, stripeSummary{data}, webhookNotified, deliveryDays, estimatedDeliveryDate`
  - Creates `attribution` with fields: `order (ref), sessionId, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, timestamp`
  - Creates `emailLog` with fields: `to, subject, status, sentAt, emailType, relatedOrder (ref)`
  - Patches `order`: `confirmationEmailSent`, `orderNumber` (optional)
  - Patches `order` on refund: `status, paymentStatus, amountRefunded, lastRefundedAt`

- `src/pages/api/save-order.ts`
  - Creates `order` (via mutation API) with fields: `stripeSessionId, cart, totalAmount, amountSubtotal, amountTax, amountShipping, amountDiscount, status, orderType, paymentStatus, createdAt, orderNumber, customerRef, customerEmail, customerName`

- `src/pages/api/vendors/create-order.ts`
  - Creates `order` for wholesale with fields: `orderNumber, orderType, status, paymentStatus, createdAt, customerName, customerEmail, customerRef, wholesaleDetails.workflowStatus, cart[] (with productRef + total), totalAmount, amountSubtotal, amountTax, amountShipping, currency`

- `src/pages/api/orders/[id].ts`
  - Patches `order`: `shippingAddress, billingAddress, opsInternalNotes`
  - Patches `customer`: `phone, email`
  - Patches `vendor`: `portalAccess.email`

### Customers, Vendors, Messages, Returns

- `src/pages/api/customer/update.ts`
  - Creates/patches `customer` fields: `userId, email, phone, address, billingAddress, firstName, lastName, emailOptIn, textOptIn, marketingOptIn`
  - Patches `vendor.portalAccess.email`

- `src/server/sanity-client.ts`
  - Patches `vendor`: `passwordResetToken, passwordResetExpires`, `portalAccess.*`, `passwordHash`, `portalAccess.lastLogin`, `status`
  - Patches `customer`: `passwordResetToken, passwordResetExpires`, `passwordHash`
  - Creates `vendorAuthToken`: `vendor (ref), tokenHash, tokenType, expiresAt, usedAt, invitedBy, createdAt`

- `src/pages/api/vendor/messages/index.ts`
  - Creates `vendorMessage` with fields: `vendor (ref), subject, status, priority, category, createdAt, lastReplyAt, replies[]`

- `src/pages/api/vendor/messages/[id].ts`
  - Appends to `vendorMessage.replies` and sets `lastReplyAt`
  - Deletes `vendorMessage`

- `src/pages/api/vendor/returns/index.ts`
  - Creates `vendorReturn` with fields: `rmaNumber, vendor (ref), order (ref), reason, description, items, status, createdAt`

- `src/pages/api/vendor/documents/upload.ts`
  - Creates `vendorDocument` with fields: `title, description, category, vendor (ref), file{asset ref}, uploadedAt, uploadedBy`

- `src/pages/api/vendor/invoices/[id]/pay.ts`
  - Patches `invoice`: `amountPaid, status`
  - Creates `vendorNotification`: `vendor (ref), type, title, message, link, read, createdAt`

- `src/pages/api/vendor/notifications/index.ts`
  - Patches `vendorNotification`: `read`

- `src/pages/api/vendor/settings/profile.ts`
  - Patches `vendor`: `companyName`, `primaryContact.email`

- `src/pages/api/vendor/settings/notifications.ts`
  - Patches `vendor`: `notificationPreferences`

- `src/pages/api/vendor/settings/addresses.ts`
  - Patches `vendor`: `shippingAddresses` (append/set/replace)

- `src/pages/api/vendor/auth/setup.ts` and `src/pages/api/vendors/setup.ts`
  - Patches `vendor.portalAccess`: `passwordHash`, `setupCompletedAt`, `enabled` + unsets `setupToken` / `setupTokenExpiry`

### Quotes, Reviews, Marketing, Attribution

- `src/pages/api/reviews/submit.ts`
  - Creates `review` with fields: `product (ref), customer (ref), customerName, customerEmail, rating, title, content, images, pros, cons, verifiedPurchase, status, submittedAt`

- `src/pages/api/reviews/[reviewId]/vote.ts`
  - Patches `review`: increments `helpful.upvotes` or `helpful.downvotes`

- `src/pages/api/save-quote.ts`
  - Creates `buildQuote` document with fields: `submittedAt, vehicleModel, modifications, horsepower, price, customer (ref)`

- `src/pages/api/build-quote.ts` and `src/server/sanity/quote-requests.ts`
  - Creates `quoteRequest` with fields listed above

- `src/pages/api/wheel-quote-*.ts`
  - Creates `wheelQuote` with fields `source, pageContext, createdAt, fullname, email, phone, vehicle*, series/diameter/width/boltPattern, finish, qty, notes, status` (+ Belak-specific fields)
  - Creates `emailLog` with fields `to, subject, status, sentAt, emailType, relatedQuote (ref)`

- `src/pages/api/form-submission.ts`
  - Creates `marketingOptIn` with fields `formName, email, name, source, pageUrl, tags, submittedAt, fields[]`

- `src/pages/api/contact.ts`
  - Creates `emailLog` with fields `to, from, subject, status, sentAt, emailType, body`

- `src/pages/api/attribution/track.ts`
  - Creates `attribution` with fields `order (ref), sessionId, utm*, timestamp`

- `src/lib/emailService.ts`
  - Creates `vendorEmailLog` with fields `vendor (ref), campaign (ref), emailNumber, subject, sentAt, status, resendId`

### Cart & Booking

- `src/pages/api/cart.ts`
  - Creates `cartItem` with fields `product (ref), quantity, sessionId, addedAt`

- `src/pages/api/bookings/create.ts`
  - Creates `booking` with fields `customer (ref), bookingDate, service, status, notes`

## External Integrations Observed

- Stripe
  - `src/pages/api/checkout.ts` creates Stripe checkout sessions using Sanity product fields for shipping config and metadata.
  - `src/pages/api/webhooks.ts` maps Stripe sessions into `order` documents and updates `customer` marketing flags.
  - `src/pages/api/vendor/invoices/[id]/pay.ts` creates Stripe payment intents and mirrors payment status into `invoice` and `vendorNotification`.
  - `src/pages/api/save-order.ts` fetches Stripe session and writes `order` into Sanity.

- EasyPost
  - `src/pages/api/checkout.ts` accepts `easypostRateId` and shipping metadata fields; `src/pages/api/webhooks.ts` persists `carrier`, `service`, `easypostRateId` into `order`.

- Email (Resend)
  - Writes `emailLog` in Sanity from `src/pages/api/webhooks.ts`, `src/pages/api/contact.ts`, `src/pages/api/wheel-quote-*.ts`.
  - Writes `vendorEmailLog` from `src/lib/emailService.ts`.

- SMS
  - No Twilio or SMS client observed in fas-cms-fresh; SMS consent content is fetched from Sanity in `src/pages/resources/employee-sms-consent.astro`.

## Studio UX & Document Actions (fas-cms-fresh)

- `packages/sanity-config/sanity.config.ts`
  - Defines Studio config referencing `sanity/schemaTypes.ts` (local schema subset)
  - Adds `SetPasswordAction` for `vendor` and `customer` documents
- `sanity/components/SetPasswordAction.tsx`
  - Patches `passwordHash` on the active document in Studio (uses Sanity client)

## Schema Ambiguity Detected — STOP CONDITION TRIGGERED

The following schema ambiguities were observed between fas-cms-fresh usage and fas-sanity schema sources:

- `buildQuote` is written as a document in `src/pages/api/save-quote.ts`, while fas-sanity defines `buildQuote` as an object type only in `packages/sanity-config/src/schemaTypes/objects/buildQuote.ts`.
- `cartItem` is written as a document in `src/pages/api/cart.ts`, while fas-sanity references `cartItem` as a nested object type inside `packages/sanity-config/src/schemaTypes/documents/checkoutSession.ts`.
- `_type == "filter"` is queried in `src/pages/shop/filters/[filters].astro`, while fas-sanity defines a document type named `filterTag` in `packages/sanity-config/src/schemaTypes/documents/filterTag.ts`.
- `_type == "booking"` is queried/created in `src/pages/api/get-user-appointments.ts` and `src/pages/api/bookings/create.ts`; no `booking` document schema was found in `packages/sanity-config/src/schemaTypes/documents/*` (compiled `schema.json` contains a `booking` type entry).
- `_type == "review"` is queried/created in `src/pages/api/reviews/*.ts` and `src/server/sanity/reviews.ts`; no `review` document schema was found in `packages/sanity-config/src/schemaTypes/documents/*` (compiled `schema.json` references `review` only as an object attribute).

Per instructions, the audit stops here.

---
AUDIT COMPLETION CONTRACT

Phase: Phase 0

Repos Audited:
- fas-cms-fresh
- fas-sanity (schema surface only)

Files Touched (READ-ONLY):
- 128
- docs/codex.md
- src/lib/sanity.ts
- src/lib/sanityClient.ts
- src/lib/sanityServer.ts
- src/lib/sanityFetch.ts
- src/server/sanity-client.ts
- src/server/sanity/promotions.ts
- src/server/sanity/collections.ts
- src/server/sanity/reviews.ts
- src/server/sanity/quote-requests.ts
- src/server/vendor-portal/data.ts
- src/server/vendor-portal/service.ts
- src/server/vendor-portal/email.ts
- src/server/vendor-application-handler.ts
- src/server/sanity/order-cart.ts
- src/lib/storefrontQueries.ts
- src/lib/queries.ts
- src/lib/blogQueries.ts
- src/lib/seoData.ts
- src/lib/seoMetrics.ts
- src/lib/sanity-utils.ts
- src/lib/customer.ts
- src/lib/vendorPostNotifications.ts
- src/lib/emailService.ts
- src/lib/sitemap.ts
- src/lib/validators/sanity.ts
- src/lib/validators/api-requests.ts
- sanity/components/SetPasswordAction.tsx
- sanity/schemaTypes.ts
- packages/sanity-config/sanity.config.ts
- packages/schemas/index.ts
- src/pages/index.astro
- src/pages/vendors/index.astro
- src/pages/vendors/[slug].astro
- src/pages/blog/index.astro
- src/pages/blog/[slug].astro
- src/pages/shop/categories.astro
- src/pages/shop/categories/[category].astro
- src/pages/shop/filters/[filters].astro
- src/pages/shop/sale/[tags].astro
- src/pages/shop/storefront.astro
- src/pages/shop/index.astro
- src/pages/shop/[slug].astro
- src/pages/shop/performance-packages/index.astro
- src/pages/press-media.astro
- src/pages/sales/cyberMonday.astro
- src/pages/blackFridaySale.astro
- src/pages/resources/employee-sms-consent.astro
- src/pages/dashboard/order/[id].astro
- src/pages/vendor-portal/catalog.astro
- src/pages/vendor-portal/blog/index.astro
- src/pages/vendor-portal/blog/[slug].astro
- src/pages/vendor-portal/setup.astro
- src/pages/vendor-portal/onboarding/downloads.astro
- src/pages/search.astro
- src/pages/admin/studio.astro
- src/pages/api/checkout.ts
- src/pages/api/webhooks.ts
- src/pages/api/save-order.ts
- src/pages/api/orders/[id].ts
- src/pages/api/get-user-order.ts
- src/pages/api/get-user-invoices.ts
- src/pages/api/get-user-quotes.ts
- src/pages/api/get-customer-profile.ts
- src/pages/api/get-user-appointments.ts
- src/pages/api/customer/update.ts
- src/pages/api/customer/get.ts
- src/pages/api/vendor/dashboard.ts
- src/pages/api/vendor/notifications/index.ts
- src/pages/api/vendor/notifications/unread-count.ts
- src/pages/api/vendor/orders.ts
- src/pages/api/vendor/orders/[id].ts
- src/pages/api/vendor/invoices.ts
- src/pages/api/vendor/invoices/[id].ts
- src/pages/api/vendor/invoices/[id]/pay.ts
- src/pages/api/vendor/returns/index.ts
- src/pages/api/vendor/documents.ts
- src/pages/api/vendor/documents/upload.ts
- src/pages/api/vendor/messages/index.ts
- src/pages/api/vendor/messages/[id].ts
- src/pages/api/vendor/settings/profile.ts
- src/pages/api/vendor/settings/notifications.ts
- src/pages/api/vendor/settings/addresses.ts
- src/pages/api/vendor/settings/password.ts
- src/pages/api/vendor/auth/setup.ts
- src/pages/api/vendor/login.ts
- src/pages/api/vendor/blog.ts
- src/pages/api/vendor/me.ts
- src/pages/api/vendor/payments.ts
- src/pages/api/vendor/analytics.ts
- src/pages/api/products.ts
- src/pages/api/products/[slug].ts
- src/pages/api/products/[productId]/reviews.ts
- src/pages/api/search.ts
- src/pages/api/collections/featured.ts
- src/pages/api/collections/menu.ts
- src/pages/api/collections/[slug].ts
- src/pages/api/promotions/active.ts
- src/pages/api/promotions/validate.ts
- src/pages/api/promotions/apply.ts
- src/pages/api/promotions/[slug].ts
- src/pages/api/reviews/submit.ts
- src/pages/api/reviews/[reviewId]/vote.ts
- src/pages/api/wheel-quote-update.ts
- src/pages/api/wheel-quote-jtx.ts
- src/pages/api/wheel-quote-belak.ts
- src/pages/api/wheel-quotes.ts
- src/pages/api/build-quote.ts
- src/pages/api/save-quote.ts
- src/pages/api/cart.ts
- src/pages/api/bookings/create.ts
- src/pages/api/vehicles.ts
- src/pages/api/tunes.ts
- src/pages/api/sanity/categories.ts
- src/pages/api/form-submission.ts
- src/pages/api/contact.ts
- src/pages/api/attribution/track.ts
- src/pages/api/admin/orders/index.ts
- src/pages/api/admin/orders/[id].ts
- src/pages/api/vendor-application.ts
- src/pages/api/vendors/invite.ts
- src/pages/api/vendors/setup.ts
- src/pages/api/vendors/create-order.ts
- src/pages/api/status.ts
- /Users/ambermin/LocalStorm/Workspace/DevProjects/GitHub/fas-sanity/packages/sanity-config/src/schemaTypes/documents/blog/blogPost.ts
- /Users/ambermin/LocalStorm/Workspace/DevProjects/GitHub/fas-sanity/packages/sanity-config/src/schemaTypes/documents/appointment.ts
- /Users/ambermin/LocalStorm/Workspace/DevProjects/GitHub/fas-sanity/packages/sanity-config/src/schemaTypes/documents/filterTag.ts
- /Users/ambermin/LocalStorm/Workspace/DevProjects/GitHub/fas-sanity/packages/sanity-config/src/schemaTypes/objects/buildQuote.ts

Schemas Observed:
- product
- category
- collection
- vendor
- customer
- order
- invoice
- quote
- quoteRequest
- promotion
- vendorMessage
- vendorNotification
- vendorReturn
- vendorDocument
- vendorAuthToken
- vendorApplication
- vendorPost
- emailCampaign
- emailLog
- vendorEmailLog
- marketingOptIn
- attribution
- wheelQuote
- downloadResource
- vehicleModel
- tune
- service
- bill
- purchaseOrder
- vendorProduct
- post
- blogCategory
- globalSeoSettings
- seoMetrics
- filterTag
- buildQuote (object type)

API Routes Observed:
- src/pages/api/checkout.ts
- src/pages/api/webhooks.ts
- src/pages/api/save-order.ts
- src/pages/api/orders/[id].ts
- src/pages/api/get-user-order.ts
- src/pages/api/get-user-invoices.ts
- src/pages/api/get-user-quotes.ts
- src/pages/api/get-customer-profile.ts
- src/pages/api/get-user-appointments.ts
- src/pages/api/customer/update.ts
- src/pages/api/customer/get.ts
- src/pages/api/vendor/dashboard.ts
- src/pages/api/vendor/notifications/index.ts
- src/pages/api/vendor/notifications/unread-count.ts
- src/pages/api/vendor/orders.ts
- src/pages/api/vendor/orders/[id].ts
- src/pages/api/vendor/invoices.ts
- src/pages/api/vendor/invoices/[id].ts
- src/pages/api/vendor/invoices/[id]/pay.ts
- src/pages/api/vendor/returns/index.ts
- src/pages/api/vendor/documents.ts
- src/pages/api/vendor/documents/upload.ts
- src/pages/api/vendor/messages/index.ts
- src/pages/api/vendor/messages/[id].ts
- src/pages/api/vendor/settings/profile.ts
- src/pages/api/vendor/settings/notifications.ts
- src/pages/api/vendor/settings/addresses.ts
- src/pages/api/vendor/settings/password.ts
- src/pages/api/vendor/auth/setup.ts
- src/pages/api/vendor/login.ts
- src/pages/api/vendor/blog.ts
- src/pages/api/vendor/me.ts
- src/pages/api/vendor/payments.ts
- src/pages/api/vendor/analytics.ts
- src/pages/api/products.ts
- src/pages/api/products/[slug].ts
- src/pages/api/products/[productId]/reviews.ts
- src/pages/api/search.ts
- src/pages/api/collections/featured.ts
- src/pages/api/collections/menu.ts
- src/pages/api/collections/[slug].ts
- src/pages/api/promotions/active.ts
- src/pages/api/promotions/validate.ts
- src/pages/api/promotions/apply.ts
- src/pages/api/promotions/[slug].ts
- src/pages/api/reviews/submit.ts
- src/pages/api/reviews/[reviewId]/vote.ts
- src/pages/api/wheel-quote-update.ts
- src/pages/api/wheel-quote-jtx.ts
- src/pages/api/wheel-quote-belak.ts
- src/pages/api/wheel-quotes.ts
- src/pages/api/build-quote.ts
- src/pages/api/save-quote.ts
- src/pages/api/cart.ts
- src/pages/api/bookings/create.ts
- src/pages/api/vehicles.ts
- src/pages/api/tunes.ts
- src/pages/api/sanity/categories.ts
- src/pages/api/form-submission.ts
- src/pages/api/contact.ts
- src/pages/api/attribution/track.ts
- src/pages/api/admin/orders/index.ts
- src/pages/api/admin/orders/[id].ts
- src/pages/api/vendor-application.ts
- src/pages/api/vendors/invite.ts
- src/pages/api/vendors/setup.ts
- src/pages/api/vendors/create-order.ts
- src/pages/api/status.ts

Integrations Observed:
- Stripe: yes
- EasyPost: yes
- Email/SMS: yes (Resend; SMS consent content only)

Schema Ambiguity Detected:
- yes
If yes, list exact schema + field names.
- buildQuote (object type in fas-sanity) vs document writes in fas-cms-fresh
- cartItem (object type in fas-sanity checkoutSession) vs document writes in fas-cms-fresh
- filterTag (document type name) vs filter queries in fas-cms-fresh
- booking (schema.json entry only; no document source in schemaTypes)
- review (no document source in schemaTypes; schema.json shows review as object attribute)

Rules Compliance:
- Code Modified: NO
- Schemas Modified: NO
- Fixes Suggested: NO
- Enforcement Performed: NO

Checksum:
- Repo snapshot hash (best-effort): fas-cms-fresh=c77b36adf6a0ec5fca802ac3ba62e1748c087ef9; fas-sanity=33360ba9294cfd8d7d3a7cd601eceab0bbab1ba5
- Timestamp (UTC): 2025-12-29T08:17:12Z

Audit Status:
- COMPLETE
- STOPPED BY DESIGN
---
