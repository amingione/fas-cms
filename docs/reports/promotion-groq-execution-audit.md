# Promotion GROQ Execution Audit

Objective: Identify the source of the GROQ parse error when applying a promotion code, given promotions.ts already uses valid \_ref projections.

## Execution Path: POST /api/promotions/apply

File: src/pages/api/promotions/apply.ts

- Calls applyPromotion(sanityServer, cart, promotionCode, customerId).
- No other GROQ queries are constructed in this file.

File: src/server/sanity/promotions.ts

- Query 1 (promotion lookup):

  `*[_type == "promotion" && code == $code && status == "active"][0]{
    _id,
    title,
    code,
    promotionType,
    discountType,
    discountValue,
    appliesTo,
    eligibleProducts[]._ref,
    eligibleCategories[]._ref,
    eligibleCollections[]._ref,
    minimumRequirements,
    customerEligibility,
    usageLimits,
    combinability,
    schedule
  }`

- Query 2 (order count for eligibility):

  `count(*[_type == "order" && references($customerId) && paymentStatus == "paid"])`

Runtime note: Both queries are static strings in this file and use valid projections. No dynamic fragments are appended.

## Other Promotion-Related GROQ Queries

File: src/lib/storefrontQueries.ts

- validatePromotionQuery (used by /api/promotions/validate):

  `*[_type == "promotion"
  && code == $code
  && status == "active"
  && schedule.isActive == true
][0]{
  _id,
  title,
  code,
  promotionType,
  discountType,
  discountValue,
  appliesTo,
  eligibleProducts[]->_id,
  eligibleCategories[]->_id,
  eligibleCollections[]->_id,
  minimumRequirements,
  customerEligibility,
  usageLimits,
  combinability,
  "isValid": schedule.isActive && (
    !defined(usageLimits.totalUsageLimit) ||
    usageLimits.currentUsageCount < usageLimits.totalUsageLimit
  )
}`

This is the only GROQ string found that contains the invalid projection syntax (eligibleProducts[]->\_id, eligibleCategories[]->\_id, eligibleCollections[]->\_id).

## Which Query Executes at Runtime

- POST /api/promotions/apply executes the two queries in src/server/sanity/promotions.ts only.
- POST/GET /api/promotions/validate executes validatePromotionQuery from src/lib/storefrontQueries.ts.

## Why the Parse Error Still Occurs

The parse error string matches validatePromotionQuery, not the query in promotions.ts. If the UI calls /api/promotions/validate before or during apply, the invalid query would throw the GROQ parse error even though promotions.ts uses valid \_ref projections.

## Confirmation: Is promotions.ts the active query?

Yes, promotions.ts is the query used by POST /api/promotions/apply. It does not contain the invalid projection syntax. The invalid GROQ projection exists in validatePromotionQuery in src/lib/storefrontQueries.ts, which is executed by /api/promotions/validate, not /api/promotions/apply.
