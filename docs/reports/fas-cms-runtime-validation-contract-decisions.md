# FAS-CMS Runtime Validation Contract Decisions

## EXECUTIVE SUMMARY

The audit identified critical validation gaps at system boundaries where external data enters the application without verification. The root cause is an architectural pattern that assumes data integrity rather than enforcing it: programmatically-created `wheelQuote` documents bypass schema validation, request handlers accept unvalidated payloads, and Stripe webhook events are processed without type safety. This creates silent failures, data inconsistencies, and potential security vulnerabilities. The fix requires adding runtime validation at all trust boundaries using Zod schemas that mirror existing patterns while preserving current application behavior.

---

## DECISIONS

### VALIDATION LIBRARY

**APPROVED**

- **Library:** Zod v3.24.4 (already installed, no new dependencies)
- **Rationale:**
  - Already in use for wheel spec validation (`src/lib/validators/jtxWheelSpec.ts`, `src/lib/validators/belakWheelSpec.ts`)
  - Established pattern in codebase
  - TypeScript-first with excellent type inference
  - Supports `.safeParse()` for error handling without exceptions
- **Location for new schemas:** `src/lib/validators/` (consistent with existing patterns)
- **Naming convention:** `{domain}{Purpose}Schema` (e.g., `sanityOrderSchema`, `stripeWebhookEventSchema`)

---

### ROUTES TO VALIDATE

**APPROVED**

The following routes and handlers MUST have runtime validation added:

#### 1. API Routes (src/pages/api/)
- `save-order.ts` - Request body validation (cart already validated, add session validation)
- `wheel-quote-update.ts` - Request body validation
- Any other API routes that accept POST/PUT/PATCH with request bodies

#### 2. Netlify Functions (netlify/functions/)
- `stripe-webhook.ts` - Webhook event payload validation (HIGH PRIORITY)
- `submission-created.ts` - Form submission payload validation
- `vendor-application.ts` - Application payload validation
- `tracking-update.ts` - Tracking data validation
- Any function accepting external webhook data

#### 3. Sanity Fetch Results
- Order documents from Sanity
- Customer documents from Sanity
- Quote/quoteRequest documents from Sanity
- Product documents from Sanity
- **wheelQuote documents** (programmatically created, currently unvalidated)

#### 4. Stripe API Responses
- Checkout Session objects
- PaymentIntent objects
- Invoice objects
- Charge objects
- Event objects

**Not in scope for initial implementation:**
- Internal utility functions
- UI components (validation occurs at boundary before data reaches UI)
- Cron jobs that only write data (no external input)

---

### SCHEMAS TO ADD (RUNTIME)

**APPROVED**

The following Zod runtime schemas MUST be created to validate data at boundaries. These are NOT Sanity schema changes.

#### 1. Sanity Document Schemas (`src/lib/validators/sanity.ts`)

```typescript
// Order validation
export const sanityOrderCartItemSchema = z.object({
  id: z.string(),
  sku: z.string().optional(),
  name: z.string(),
  price: z.number(),
  quantity: z.number().int().positive(),
  categories: z.array(z.string()).optional(),
  image: z.string().optional(),
  productUrl: z.string().optional(),
  productSlug: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
});

export const sanityOrderSchema = z.object({
  _id: z.string(),
  _type: z.literal('order'),
  orderNumber: z.string().optional(),
  stripeSessionId: z.string(),
  paymentIntentId: z.string().optional(),
  status: z.enum(['pending', 'paid', 'unpaid', 'failed', 'refunded', 'cancelled']),
  cart: z.array(sanityOrderCartItemSchema),
  totalAmount: z.number(),
  customerEmail: z.string().email(),
  customerName: z.string().optional(),
  customer: z.object({
    _type: z.literal('reference'),
    _ref: z.string()
  }).optional(),
  createdAt: z.string(),
  // Add other fields as needed based on actual schema
});

// Customer validation
export const sanityCustomerSchema = z.object({
  _id: z.string(),
  _type: z.literal('customer'),
  email: z.string().email(),
  name: z.string().optional(),
  phone: z.string().optional(),
  // Add other fields based on actual schema
});

// WheelQuote validation (currently ad-hoc, needs formalization)
export const sanityWheelQuoteSchema = z.object({
  _id: z.string(),
  _type: z.literal('wheelQuote'),
  // Fields must match structure created by wheel-quote-jtx and wheel-quote-belak
  // This should be derived from existing validators
  series: z.string(),
  fullname: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  vehicleYear: z.string().optional(),
  vehicleMake: z.string().optional(),
  vehicleModel: z.string().optional(),
  // Add remaining fields from jtxWheelQuoteSchema and wheelQuoteSchema
});

// QuoteRequest validation
export const sanityQuoteRequestSchema = z.object({
  _id: z.string(),
  _type: z.literal('quoteRequest'),
  wheelQuotes: z.array(z.object({
    _type: z.literal('reference'),
    _ref: z.string()
  })).optional(),
  customerName: z.string(),
  customerEmail: z.string().email(),
  customerPhone: z.string().optional(),
  // Add other denormalized fields from schema
});
```

#### 2. Stripe Response Schemas (`src/lib/validators/stripe.ts`)

```typescript
// Minimal validation for Stripe objects received from API
export const stripeCheckoutSessionSchema = z.object({
  id: z.string(),
  payment_status: z.string(),
  payment_intent: z.union([z.string(), z.object({ id: z.string() })]).optional(),
  customer_details: z.object({
    email: z.string().email().nullable(),
    name: z.string().nullable(),
    phone: z.string().nullable(),
    address: z.object({
      line1: z.string().nullable(),
      line2: z.string().nullable(),
      city: z.string().nullable(),
      state: z.string().nullable(),
      postal_code: z.string().nullable(),
      country: z.string().nullable()
    }).nullable()
  }).nullable(),
  amount_total: z.number().nullable(),
  amount_subtotal: z.number().nullable(),
  currency: z.string().optional(),
  created: z.number().optional(),
  // Add other critical fields validated by stripe-webhook.ts
});

export const stripePaymentIntentSchema = z.object({
  id: z.string(),
  status: z.string(),
  charges: z.object({
    data: z.array(z.object({
      id: z.string(),
      receipt_url: z.string().optional(),
      payment_method_details: z.object({
        card: z.object({
          brand: z.string().optional(),
          last4: z.string().optional()
        }).optional()
      }).optional()
    }))
  }).optional()
});

export const stripeWebhookEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.object({
    object: z.record(z.unknown())
  })
});
```

#### 3. Request Body Schemas (add to existing validator files or create new)

```typescript
// src/lib/validators/api-requests.ts
export const saveOrderRequestSchema = z.object({
  sessionId: z.string().min(1),
  cart: z.array(z.object({
    id: z.string(),
    sku: z.string().optional(),
    name: z.string(),
    price: z.number(),
    quantity: z.number(),
    categories: z.array(z.string()).optional(),
    image: z.string().optional(),
    productUrl: z.string().optional(),
    productSlug: z.string().optional(),
    metadata: z.record(z.any()).optional()
  }))
});

// Reuse existing wheel spec validators
// Export from existing files: jtxWheelQuoteSchema, wheelQuoteSchema
```

**Schema organization rules:**
- Group related schemas by domain (sanity.ts, stripe.ts, api-requests.ts)
- Reuse existing schemas where possible (wheel specs already exist)
- Schemas validate STRUCTURE, not business logic
- Use `.optional()` for truly optional fields only
- Use `.nullable()` for fields that can be explicitly null
- Keep schemas focused on data shape validation

---

### ERROR HANDLING POLICY

**APPROVED**

#### 1. Validation Failure Response Standards

**API Routes (src/pages/api/):**
- Return HTTP 422 (Unprocessable Entity) for validation failures
- Response format:
  ```json
  {
    "error": "Validation failed",
    "details": <ZodError.format()>
  }
  ```
- MUST use `schema.safeParse()` instead of `schema.parse()`
- Log validation failures with context

**Netlify Functions:**
- Return HTTP 400 (Bad Request) for validation failures
- Response format:
  ```json
  {
    "statusCode": 400,
    "body": JSON.stringify({
      "error": "Invalid request",
      "details": <ZodError.format()>
    })
  }
  ```
- MUST use `schema.safeParse()` instead of `schema.parse()`
- Log validation failures with context

**Webhook Handlers (stripe-webhook.ts):**
- Validation failures return HTTP 400
- MUST log validation failure details
- MUST NOT process invalid webhooks
- Response format: `{ error: "Invalid webhook payload", details: <errors> }`

**Sanity Fetch Validation:**
- If validation fails, log error with document ID
- Treat as missing data (null/undefined)
- Allow query to continue but return partial results
- MUST NOT crash application
- Pattern:
  ```typescript
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error('[sanity-fetch-validation]', { _id: data?._id, errors: result.error });
    return null;
  }
  return result.data;
  ```

**Stripe API Response Validation:**
- If validation fails, log error with Stripe object ID
- Throw error to prevent processing invalid Stripe data
- Pattern:
  ```typescript
  const result = schema.safeParse(stripeObject);
  if (!result.success) {
    console.error('[stripe-validation]', { id: stripeObject?.id, errors: result.error });
    throw new Error('Invalid Stripe response');
  }
  return result.data;
  ```

#### 2. Error Message Requirements

- NEVER expose internal validation details to end users in production
- Development: Include full Zod error details
- Production: Generic error messages + logging
- All validation errors MUST be logged with context:
  - Timestamp
  - Request/document identifier
  - Validation schema name
  - Validation error details

---

### LOGGING POLICY

**APPROVED**

#### 1. Validation Event Logging

All validation failures MUST be logged using the following format:

```typescript
console.error('[validation-failure]', {
  schema: 'schemaName',
  context: 'route/function-name',
  identifier: 'id/sessionId/documentId',
  timestamp: new Date().toISOString(),
  errors: result.error.format()
});
```

#### 2. Logging Locations

- API route validation failures: Immediately after `.safeParse()` returns failure
- Webhook validation failures: Before returning error response
- Sanity fetch validation failures: After fetching document, before using data
- Stripe response validation failures: After receiving response, before processing

#### 3. Logging Levels

- `console.error`: Validation failures that prevent processing
- `console.warn`: Validation failures that allow degraded processing (Sanity fetch)
- `console.log`: Successful validation in development only (optional)

#### 4. What NOT to Log

- Full request/response bodies (may contain sensitive data)
- Customer PII (email, phone, address) unless necessary for debugging
- Stripe secret keys or tokens
- Sanity write tokens

---

### DATA INTEGRITY RULES

**APPROVED**

After implementing runtime validation, the following invariants MUST hold:

#### 1. Order Integrity
- Every order document fetched from Sanity MUST have a valid `stripeSessionId`
- Every order document MUST have a non-empty `cart` array
- Every cart item MUST have `id`, `name`, `price`, and positive `quantity`
- If `customer` reference exists, it MUST point to a valid customer document ID

#### 2. Customer Integrity
- Every customer document MUST have a valid email address
- Customer references in orders MUST be properly formatted: `{ _type: 'reference', _ref: 'customerId' }`

#### 3. Webhook Event Integrity
- Every processed Stripe webhook MUST have validated event type
- Checkout session events MUST have validated session data before creating orders
- Payment intent events MUST have validated payment data before updating order status

#### 4. WheelQuote Integrity (Addresses Audit Finding)
- Every `wheelQuote` document created programmatically MUST pass validation
- WheelQuote references in `quoteRequest.wheelQuotes` MUST point to valid document IDs
- **Note:** This does NOT enforce referential integrity at database level, but validates structure at creation/fetch time

#### 5. Stripe Object Integrity
- All Stripe objects used in business logic MUST pass validation before use
- Webhook events MUST validate signature before payload validation
- Checkout session data MUST validate before order creation

#### 6. Degraded Operation Rules
- If Sanity fetch validation fails, treat as missing data (allow null/undefined)
- If request validation fails, reject request (do not process)
- If webhook validation fails, reject webhook (do not process)
- If Stripe response validation fails, throw error (do not process)

---

### FORBIDDEN CHANGES

**EXPLICITLY PROHIBITED**

Codex is NOT allowed to:

1. **Sanity Schema Changes**
   - Do NOT modify schema definitions in `schemas/` directory
   - Do NOT add new Sanity document types
   - Do NOT change field types in existing Sanity schemas
   - Do NOT add required fields to Sanity schemas

2. **Stripe Account Configuration**
   - Do NOT modify Stripe webhook endpoint configuration
   - Do NOT change Stripe API version
   - Do NOT modify Stripe product/price structure

3. **Business Logic Changes**
   - Do NOT change order creation logic beyond adding validation
   - Do NOT modify customer deduplication logic
   - Do NOT change cart calculation logic
   - Do NOT alter email sending behavior
   - Do NOT modify inventory reservation logic

4. **Database Operations**
   - Do NOT add database constraints
   - Do NOT modify existing Sanity queries (only wrap with validation)
   - Do NOT change document creation patterns (only add validation)

5. **API Contracts**
   - Do NOT change API response formats (only add validation)
   - Do NOT modify HTTP status codes (except adding 422 for validation failures)
   - Do NOT change request body structure
   - Do NOT alter webhook response format

6. **External Dependencies**
   - Do NOT add new validation libraries (use Zod only)
   - Do NOT upgrade Zod version
   - Do NOT modify existing wheel spec validators (reuse as-is)

7. **Error Handling Behavior**
   - Do NOT change existing try/catch blocks (only add validation)
   - Do NOT modify existing error responses (only add new validation error responses)
   - Do NOT change logging format (only add validation logging)

---

### LOGIC CHANGES

**APPROVED**

The following logic paths MUST be modified to add validation:

#### 1. API Route Handlers (src/pages/api/)

**save-order.ts:**
- After receiving request body, BEFORE accessing `sessionId` or `cart`
- Validate entire request body with `saveOrderRequestSchema.safeParse()`
- If validation fails, return 422 with error details
- Continue existing logic only if validation succeeds

**wheel-quote-update.ts:**
- After receiving request body, BEFORE processing quote data
- Validate with appropriate wheel spec schema (reuse existing)
- If validation fails, return 422 with error details

**Conditions:** Validation MUST run on every request, before any business logic

#### 2. Netlify Function Handlers

**stripe-webhook.ts (HIGH PRIORITY):**
- After signature verification, BEFORE accessing `evt.data.object`
- Validate webhook event structure with `stripeWebhookEventSchema.safeParse()`
- For `checkout.session.completed`, validate session with `stripeCheckoutSessionSchema.safeParse()`
- For payment intent events, validate with `stripePaymentIntentSchema.safeParse()`
- If validation fails at any point, return 400 and log error
- Continue existing logic only if validation succeeds

**submission-created.ts:**
- After receiving event body, BEFORE processing form data
- Validate form submission structure
- If validation fails, return 400

**Conditions:** Validation MUST run on every webhook/event, after authentication but before processing

#### 3. Sanity Fetch Operations

**Pattern to apply wherever Sanity documents are fetched:**
```typescript
// Existing fetch
const order = await sanity.fetch(`*[_type=="order" && _id==$id][0]`, { id });

// Add validation wrapper
const orderResult = sanityOrderSchema.safeParse(order);
if (!orderResult.success) {
  console.warn('[sanity-validation]', {
    _id: order?._id,
    _type: 'order',
    errors: orderResult.error.format()
  });
  // Treat as null, allow graceful degradation
  return null;
}
const validatedOrder = orderResult.data;
```

**Locations:**
- stripe-webhook.ts: Order/customer fetch operations
- save-order.ts: Customer fetch operations
- Any Netlify function fetching orders, customers, quotes
- **wheelQuote** fetches (if any exist)

**Conditions:** Validation MUST run after every Sanity fetch, before using data

#### 4. Stripe API Response Handling

**stripe-webhook.ts:**
- After `stripe.checkout.sessions.retrieve()`, validate session
- After `stripe.paymentIntents.retrieve()`, validate payment intent
- After `stripe.checkout.sessions.listLineItems()`, validate line items structure

**Pattern:**
```typescript
const session = await stripe.checkout.sessions.retrieve(sessionId);
const sessionResult = stripeCheckoutSessionSchema.safeParse(session);
if (!sessionResult.success) {
  console.error('[stripe-validation]', {
    id: session.id,
    errors: sessionResult.error.format()
  });
  throw new Error('Invalid Stripe session response');
}
const validatedSession = sessionResult.data;
```

**Conditions:** Validation MUST run after every Stripe API call, before using response

---

### ROLLBACK SAFETY

**APPROVED**

This implementation is safe to rollback because:

#### 1. Additive Changes Only
- Validation is added BEFORE existing logic, not replacing it
- No existing code paths are removed
- No existing function signatures change
- No API response formats change (only new error responses added)

#### 2. Isolated Failure Scope
- Validation failures affect only the current request/webhook
- No shared state is modified by validation
- No database writes occur during validation
- Failed validation prevents processing but doesn't break existing data

#### 3. No Data Migration Required
- Existing Sanity documents are unchanged
- No database schema changes
- No data backfill needed
- Validation applies only to new incoming data

#### 4. Independent Module Structure
- New validator files (`src/lib/validators/sanity.ts`, `stripe.ts`) are standalone
- Removing validator imports reverts to previous behavior
- No circular dependencies created
- Can be deployed incrementally (route by route)

#### 5. Backwards Compatibility
- Existing wheel spec validators unchanged (reused as-is)
- Existing Zod patterns preserved
- No Zod version change
- No breaking changes to existing validated routes

#### 6. Monitoring Safety
- All validation failures are logged
- Existing logging continues unchanged
- Can monitor validation failure rates before enforcing
- Can identify problematic schemas and adjust

#### 7. Feature Flag Capability (Optional)
- Validation can be wrapped in environment variable check
- `if (process.env.ENABLE_VALIDATION === 'true') { validate() }`
- Allows gradual rollout
- Can disable without code changes

#### 8. What Would Break on Rollback
- Nothing. Removing validation returns to current (unvalidated) behavior
- Existing functionality continues as-is
- No data corruption possible from rollback
- No user-facing changes except fewer 422/400 responses

---

## IMPLEMENTATION NOTES FOR CODEX

### Phase 1: Schema Creation (LOW RISK)
1. Create `src/lib/validators/sanity.ts` with Sanity document schemas
2. Create `src/lib/validators/stripe.ts` with Stripe response schemas
3. Create `src/lib/validators/api-requests.ts` with request body schemas
4. Export existing wheel spec schemas for reuse

### Phase 2: Critical Path (HIGH PRIORITY)
1. Add validation to `stripe-webhook.ts` (prevents invalid order creation)
2. Add validation to `save-order.ts` (prevents invalid cart processing)
3. Add validation to Sanity fetch operations in webhook handler

### Phase 3: Comprehensive Coverage (MEDIUM PRIORITY)
1. Add validation to remaining API routes
2. Add validation to remaining Netlify functions
3. Add validation to remaining Sanity fetch operations

### Phase 4: Verification
1. Test validation with invalid payloads (should return 400/422)
2. Test validation with valid payloads (should process normally)
3. Verify logging of validation failures
4. Monitor error rates in production

---

## UNKNOWN CONSTRAINTS

The following information was NOT available in the audit and requires conservative decisions:

1. **WheelQuote Complete Schema:** Audit mentions `wheelQuote` but does not provide complete field list beyond what exists in `jtxWheelQuoteSchema` and `wheelQuoteSchema`. Decision: Use fields from existing validators as baseline.

2. **All API Routes:** Audit does not list all API routes accepting POST/PUT/PATCH. Decision: Validate known routes first (save-order, wheel-quote-update), identify others during implementation.

3. **Complete Sanity Document Schemas:** Audit does not provide full field lists for all document types. Decision: Create validators for known fields, use `.passthrough()` for flexibility.

4. **Stripe API Version Compatibility:** Current Stripe API version is '2025-08-27.basil' (from save-order.ts). Zod schemas must align with this version's response structure. Decision: Validate only critical fields used in business logic.

5. **Production Error Rates:** Unknown what percentage of current data would fail validation. Decision: Log failures without breaking, monitor rates before enforcing strict validation.

---

## ACCEPTANCE CRITERIA

Implementation is complete when:

1. ✅ All schemas listed in "SCHEMAS TO ADD" are created
2. ✅ All routes listed in "ROUTES TO VALIDATE" have validation implemented
3. ✅ Validation failures return correct HTTP status codes (422/400)
4. ✅ All validation failures are logged per LOGGING POLICY
5. ✅ No business logic changes beyond adding validation
6. ✅ No Sanity schema changes
7. ✅ No Stripe configuration changes
8. ✅ Tests demonstrate validation catches invalid data
9. ✅ Tests demonstrate valid data continues processing normally
10. ✅ Documentation updated with validation patterns

---

**Document Version:** 1.0
**Date:** 2025-12-27
**Authority:** Claude (Decision Authority)
**Implementation:** Codex (following this contract exactly)
