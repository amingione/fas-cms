# Checkout Discounts & Coupons Audit

## Summary of Findings

The checkout and discounts system has a significant architectural gap. While a robust, rule-based promotion system exists on the backend, the frontend UI completely lacks the functionality to use it.

There are two parallel and unconnected discount systems:

1.  **Stripe Customer Discounts**: Data for customer-specific discounts is synced from Stripe and stored on the Sanity `customer` document. However, the entire checkout flow (`src/pages/api/checkout.ts`) is unaware of this data and never applies these discounts.
2.  **Sanity Promotions**: A backend system allows creating promotions with specific codes, rules (usage limits, customer eligibility, minimum amounts), and discount types (percentage or fixed amount). The logic is handled in `src/server/sanity/promotions.ts` and exposed via the `/api/promotions/apply` endpoint.

The core issue is that the primary cart component (`src/components/storefront/ShoppingCart.tsx`) has no input field for a user to enter a promotion code. Therefore, the Sanity Promotions system, while fully implemented on the backend, is currently inaccessible to users.

Discounts are passed to Stripe by pre-calculating the final price. The application subtracts any applicable discount from the line item's price before creating the Stripe session. Stripe itself has no knowledge of the promotion code used.

To enable the feature, the `ShoppingCart.tsx` component must be modified to include a form that calls the `/api/promotions/apply` endpoint and updates the client-side cart state with the calculated discount before proceeding to checkout.

## Relevant Files

| File | Reasoning |
| --- | --- |
| `src/components/storefront/ShoppingCart.tsx` | This is the primary UI component for the shopping cart. The audit reveals it correctly displays product-level sale prices but critically lacks any UI (input field, apply button) for a user to enter a coupon code. This is the main source of the feature gap. |
| `src/pages/api/checkout.ts` | This is the serverless function that creates the Stripe Checkout session. It does not use Stripe's native `discounts` or `allow_promotion_codes` features. Instead, it expects the discount to have been pre-calculated and subtracted from the line item's price (`unitAmount`), making the application solely responsible for discount logic. |
| `src/pages/api/promotions/apply.ts` | This is the backend API endpoint that was built to handle coupon code application. It receives a promotion code and the cart contents, and it calls the core promotion logic. It exists but is currently unused by the main cart UI. |
| `src/server/sanity/promotions.ts` | This file contains the complete business logic for validating and calculating discounts from Sanity `promotion` documents. It checks for active status, usage limits, customer eligibility, and minimum purchase amounts, and calculates the final discount. This demonstrates that a robust promotion system is implemented on the backend. |
| `docs/reports/audit-discount-surfacing.md` | This and other audit documents were crucial in understanding the architectural decision to have two separate discount systems: Stripe-synced `customerDiscount` objects (which are ignored by the checkout flow) and Sanity-native `promotion` documents. |

