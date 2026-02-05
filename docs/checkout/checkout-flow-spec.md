❌ THIS IS ALL WRONG. DO NOT USE. ❌
02-06-26
ambermin

# Single-Page Checkout Flow Specification

Document Version: 1.0
Target System: Medusa-first commerce with Stripe
PaymentIntents
Purpose: Architectural specification for implementation

---

1️⃣ Checkout State Machine

STATE: CART_LOADING

Entry Point: User navigates to /checkout

Allowed Actions:

     - Fetch cart from Medusa
     - Display loading indicator

Locked:

     - All user inputs
     - All buttons

API Calls:

     - GET /store/carts/{cartId}

Transition To:

     - CART_EMPTY if cart has no items
     - ADDRESS_ENTRY if cart has items

Exit Condition: Cart data loaded

---

STATE: CART_EMPTY

Purpose: Terminal state when cart is empty

Allowed Actions:

     - Display "Your cart is empty" message
     - Provide link back to shopping

Locked:

     - All checkout actions

API Calls: None

Transition To: None (terminal state)

User Recovery: Navigate back to store

---

STATE: ADDRESS_ENTRY

Purpose: User provides shipping address

Allowed Actions:

     - Edit all address fields (first name, last name, address,

city, state, zip, country) - Edit email address - Submit address

Unlocked Fields:

     - Customer email (text input)
     - First name (text input)
     - Last name (text input)
     - Address line 1 (text input)
     - Address line 2 (text input, optional)
     - City (text input)
     - State/Province (dropdown or text)
     - Postal code (text input)
     - Country (dropdown, default US)

Locked:

     - Cart items (display only)
     - Subtotal (display only)
     - Shipping options (not yet available)
     - Payment section (disabled)

API Calls Allowed:

     - None until user submits address

Validation Rules:

     - All required fields must be non-empty
     - Email must be valid format
     - Postal code must match country format
     - State must be valid for country

Transition To:

     - SHIPPING_CALCULATION when address submitted and valid

Exit Condition: User clicks "Continue to Shipping" and
validation passes

---

STATE: SHIPPING_CALCULATION

Purpose: System fetches shipping options and calculates tax

Allowed Actions:

     - Display loading indicator
     - Show submitted address (read-only)

Locked:

     - Address fields (read-only)
     - Shipping options (loading)
     - Payment section (disabled)

API Calls (execute in sequence):

     - POST /store/carts/{cartId} - Update address and email
     - GET /store/shipping-options?cart_id={cartId} - Fetch

available shipping methods

What Happens:

     - Address submitted to Medusa
     - Medusa calculates available shipping options
     - Medusa calculates tax based on address
     - Cart total updates with tax (no shipping yet)

Transition To:

     - SHIPPING_SELECTION when options loaded successfully
     - SHIPPING_ERROR if API fails

Exit Condition: Shipping options returned OR error occurs

---

STATE: SHIPPING_SELECTION

Purpose: User selects shipping method

Allowed Actions:

     - Select one shipping option (radio buttons)
     - Edit address (returns to ADDRESS_ENTRY)
     - Submit shipping selection

Unlocked Fields:

     - Shipping option selector (radio buttons)
     - "Edit Address" button

Locked:

     - Cart items (display only)
     - Email (display only with edit option)
     - Address (display only with edit option)
     - Payment section (disabled)

Display Requirements:

     - Show all available shipping options with:
       - Carrier name (e.g., "UPS Ground")
       - Delivery estimate (if available)
       - Price
     - Show updated subtotal
     - Show tax amount
     - Show "Total (before shipping)" label
     - Indicate shipping not yet included in total

API Calls Allowed:

     - None until user selects option and submits

Validation Rules:

     - Exactly one shipping option must be selected

Transition To:

     - ADDRESS_ENTRY if user clicks "Edit Address"
     - SHIPPING_APPLYING when user submits selection

Exit Condition: User selects shipping and clicks "Continue to
Payment"

---

STATE: SHIPPING_APPLYING

Purpose: System applies shipping method to cart

Allowed Actions:

     - Display loading indicator

Locked:

     - All inputs
     - All buttons

API Calls:

     - POST /store/carts/{cartId}/shipping-methods with {

option_id: selectedOptionId }

What Happens:

     - Selected shipping method applied to cart
     - Medusa recalculates cart total (subtotal + tax + shipping)
     - Cart is now fully finalized

Transition To:

     - CART_FINALIZED when shipping applied successfully
     - SHIPPING_ERROR if API fails

Exit Condition: Shipping method applied OR error occurs

---

STATE: CART_FINALIZED

Purpose: Display final totals before payment

Allowed Actions:

     - Review final order summary
     - Edit address (with warning)
     - Edit shipping (with warning)
     - Proceed to payment

Unlocked Fields:

     - "Edit Address" button (with warning modal)
     - "Edit Shipping" button (with warning modal)
     - "Proceed to Payment" button

Locked:

     - Cart items (display only)
     - All totals (display only)

Display Requirements:

     - Show complete order summary:
       - Line items with quantities and prices
       - Subtotal
       - Shipping method and cost
       - Tax amount
       - Final Total (prominently displayed)
     - Show shipping address
     - Show email address
     - Show selected shipping method

Warning Behavior:

     - If user clicks "Edit Address" or "Edit Shipping", show

modal: - "Changing your address or shipping will recalculate your
order. Do you want to continue?" - [Cancel] [Yes, Edit]

API Calls Allowed: None

Transition To:

     - ADDRESS_ENTRY if user confirms edit address
     - SHIPPING_SELECTION if user confirms edit shipping
     - PAYMENT_INTENT_CREATING when user clicks "Proceed to

Payment"

Exit Condition: User confirms order and proceeds to payment

---

STATE: PAYMENT_INTENT_CREATING

Purpose: Create Stripe PaymentIntent with locked totals

Allowed Actions:

     - Display loading indicator
     - Show "Securing your payment..." message

Locked:

     - ALL INPUTS (entire form locked)
     - Cart is now IMMUTABLE

API Calls:

     - POST /api/medusa/payments/create-intent with { cartId }

What Happens:

     - Backend validates cart state:
       - Has items
       - Has shipping method
       - Has address
       - Has valid total
     - Backend creates Stripe PaymentIntent with amount =

cart.total - Backend returns client_secret

Critical: This is the LOCK POINT. After this state:

     - Cart CANNOT be modified
     - Address CANNOT be changed
     - Shipping CANNOT be changed
     - If user tries to edit, they must start over

Transition To:

     - PAYMENT_READY when PaymentIntent created successfully
     - PAYMENT_INTENT_ERROR if creation fails

Exit Condition: PaymentIntent created OR error occurs

---

STATE: PAYMENT_READY

Purpose: User enters payment details

Allowed Actions:

     - Enter payment details via Stripe Elements
     - Submit payment

Unlocked Fields:

     - Stripe Card Element (or Payment Element)
     - "Pay Now" button

Locked:

     - ALL CART DATA (entire order locked)
     - Address (display only, no edit)
     - Shipping (display only, no edit)
     - Cart items (display only, no edit)
     - Totals (display only, no edit)

Display Requirements:

     - Show locked order summary (read-only)
     - Show "Your order is secured" indicator
     - Display final total prominently
     - Show Stripe Elements
     - Show "Pay Now" button

API Calls Allowed:

     - stripe.confirmPayment() (client-side to Stripe)

Validation Rules:

     - Stripe validates payment details

Warning Behavior:

     - Display prominent message: "Your order details are locked

for security. To make changes, you'll need to restart
checkout." - Provide "Start Over" link that creates new cart

Transition To:

     - PAYMENT_PROCESSING when user clicks "Pay Now"
     - CART_LOADING if user clicks "Start Over" (creates new

cart)

Exit Condition: User submits payment

---

STATE: PAYMENT_PROCESSING

Purpose: Stripe processes payment

Allowed Actions:

     - Display loading indicator
     - Show "Processing payment..." message

Locked:

     - All inputs
     - All buttons

API Calls:

     - Stripe confirms payment (client → Stripe)
     - Stripe webhook fires (Stripe → backend)
     - Backend completes order in Medusa

What Happens:

     - Stripe processes payment
     - Stripe sends payment_intent.succeeded webhook
     - Backend validates cart total matches PaymentIntent amount
     - Backend completes order in Medusa
     - Backend creates order in Sanity

Transition To:

     - PAYMENT_SUCCESS if payment succeeds
     - PAYMENT_FAILED if payment fails

Exit Condition: Payment succeeds OR fails

---

STATE: PAYMENT_SUCCESS

Purpose: Payment confirmed, order created

Allowed Actions:

     - Display success message
     - Show order number
     - Provide link to order details

Locked:

     - All checkout actions

Display Requirements:

     - Success message: "Your order has been placed!"
     - Order number
     - Confirmation email message
     - Link to order status page
     - Link to continue shopping

API Calls: None

Transition To: None (terminal state)

User Recovery: Navigate to order status or continue shopping

---

STATE: PAYMENT_FAILED

Purpose: Payment declined or error

Allowed Actions:

     - Display error message
     - Retry payment
     - Update payment method

Unlocked Fields:

     - Stripe Elements (allow retry)
     - "Try Again" button

Locked:

     - Cart data (still locked from PAYMENT_READY)
     - Address (still locked)
     - Shipping (still locked)

Display Requirements:

     - Error message from Stripe
     - Option to try again with same or different payment method
     - Option to start over

API Calls Allowed:

     - stripe.confirmPayment() (retry)

Transition To:

     - PAYMENT_PROCESSING if user retries
     - CART_LOADING if user starts over

Exit Condition: User retries OR starts over

---

ERROR STATES

STATE: SHIPPING_ERROR

Purpose: Shipping calculation or application failed

Allowed Actions:

     - Display error message
     - Retry button
     - Edit address button

Display Requirements:

     - Error message: "Unable to calculate shipping for this

address" - Possible causes: Invalid address, no shipping available - Options: Edit address, Retry, Contact support

Transition To:

     - SHIPPING_CALCULATION if user clicks Retry
     - ADDRESS_ENTRY if user clicks Edit Address

---

STATE: PAYMENT_INTENT_ERROR

Purpose: PaymentIntent creation failed

Allowed Actions:

     - Display error message
     - Retry button
     - Start over button

Display Requirements:

     - Error message: "Unable to secure payment. Please try

again." - Technical details logged (not shown to user)

Transition To:

     - PAYMENT_INTENT_CREATING if user clicks Retry
     - CART_LOADING if user starts over

---

2️⃣ Mutation Lock Rules

LOCK POINT

State: PAYMENT_INTENT_CREATING
Trigger: Backend receives POST
/api/medusa/payments/create-intent
Effect: Cart becomes PERMANENTLY IMMUTABLE for this checkout
session

---

LOCKED FIELDS (after PAYMENT_INTENT_CREATING)

Cart Items

     - Locked: Quantities, products, variants
     - UI Behavior: Display only, no edit buttons
     - API Calls Blocked:
       - POST /store/carts/{cartId}/line-items (add item)
       - POST /store/carts/{cartId}/line-items/{itemId} (update

quantity) - DELETE /store/carts/{cartId}/line-items/{itemId} (remove
item)

Address

     - Locked: All address fields, email
     - UI Behavior: Display as read-only card, no edit button
     - API Calls Blocked:
       - POST /store/carts/{cartId} (update address)

Shipping

     - Locked: Selected shipping method
     - UI Behavior: Display selected method only, no selector
     - API Calls Blocked:
       - POST /store/carts/{cartId}/shipping-methods (change

method)

Discounts/Promotions

     - Locked: Applied discount codes
     - UI Behavior: No discount code input field visible
     - API Calls Blocked:
       - POST /store/carts/{cartId}/discounts (apply code)
       - DELETE /store/carts/{cartId}/discounts/{code} (remove

code)

---

UI RESPONSE TO EDIT ATTEMPTS

Before Lock (states ADDRESS_ENTRY through CART_FINALIZED):

     - Show warning modal: "Changing this will recalculate your

order. Continue?" - Allow user to return to earlier state - Recalculate everything from scratch

After Lock (states PAYMENT_INTENT_CREATING and later):

     - Show error modal: "Your order is secured for payment. To

make changes, you must start over." - Provide "Start Over" button that: - Creates new cart - Abandons current PaymentIntent - Returns to CART_LOADING state - Provide "Cancel" button that returns to payment form

---

MUTATION DETECTION (Webhook Level)

Location: Backend webhook handler
Timing: Before completing order in Medusa

Algorithm:

     1. Fetch current cart from Medusa: GET /store/carts/{cartId}
     2. Extract current total: cart.total
     3. Round to integer: currentTotal = Math.round(cart.total)
     4. Extract PaymentIntent amount: intentAmount =

paymentIntent.amount 5. Compare:
IF currentTotal !== intentAmount THEN - Log error with details - Throw error: "Cart total mismatch" - DO NOT complete order
ELSE - Proceed with order completion

Error Response:

     - HTTP 400 to Stripe webhook
     - Error logged with details:
       - cart_id
       - current_total
       - intent_amount
       - difference
       - timestamp
     - Order NOT created
     - User sees payment failure
     - User must start over with new cart

---

PREVENTING KNOWN MUTATION SCENARIOS

Scenario 1: User Opens Checkout in Multiple Tabs

     - Prevention: PaymentIntent tied to specific cart state
     - Detection: Webhook validates cart total
     - Result: Only first successful payment completes; others

fail validation

Scenario 2: Cart Modified While Payment Processing

     - Prevention: Cart locked before PaymentIntent creation
     - Detection: API calls blocked by frontend state machine
     - Result: User cannot modify cart once in PAYMENT_READY

state

Scenario 3: Shipping Change Triggers Cart Recalculation

     - Prevention: Shipping locked in PAYMENT_INTENT_CREATING

state - Detection: Shipping update API blocked - Result: Shipping cannot change after lock

Scenario 4: Discount Code Applied During Checkout

     - Prevention: Discount input removed after CART_FINALIZED
     - Detection: Discount API calls blocked after lock
     - Result: Discounts must be applied before finalizing

---

3️⃣ API Interaction Map

INTERACTION 1: Initial Cart Load

Trigger: User navigates to /checkout
Caller: Frontend (client-side)
Timing: Immediate on page load
State: CART_LOADING

Request:

     GET /store/carts/{cartId}
     Headers:
       - x-publishable-api-key: {medusa_publishable_key}

Response Used:

     - cart.id
     - cart.items[] (display line items)
     - cart.subtotal (display)
     - cart.currency_code
     - cart.email (pre-fill if exists)

Data NEVER Sent to Stripe: N/A (no Stripe interaction)

Error Handling:

     - 404 → Navigate to cart page with "Cart not found"
     - 500 → Show "Unable to load cart. Please try again."

---

INTERACTION 2: Address Submission

Trigger: User submits address form
Caller: Frontend (client-side)
Timing: When user clicks "Continue to Shipping"
State: ADDRESS_ENTRY → SHIPPING_CALCULATION

Request:

     POST /store/carts/{cartId}
     Headers:
       - x-publishable-api-key: {medusa_publishable_key}
       - Content-Type: application/json
     Body:
     {
       "email": "user@example.com",
       "shipping_address": {
         "first_name": "John",
         "last_name": "Doe",
         "address_1": "123 Main St",
         "address_2": "",
         "city": "Los Angeles",
         "province": "CA",
         "postal_code": "90001",
         "country_code": "us"
       }
     }

Response Used:

     - cart.id (confirmation)
     - cart.email
     - cart.shipping_address (confirmation)
     - cart.tax_total (updated with address)

Data NEVER Sent to Stripe: N/A (no Stripe interaction)

Side Effects:

     - Medusa calculates tax based on address
     - Cart total updates with tax
     - Shipping not yet applied

Error Handling:

     - 400 with validation errors → Show field-specific errors
     - 500 → Show "Unable to save address. Please try again."

---

INTERACTION 3: Fetch Shipping Options

Trigger: Immediately after address submission
Caller: Frontend (client-side)
Timing: After address API succeeds
State: SHIPPING_CALCULATION

Request:

     GET /store/shipping-options?cart_id={cartId}
     Headers:
       - x-publishable-api-key: {medusa_publishable_key}

Response Used:

     - shipping_options[] array:
       - id (for selection)
       - name (display)
       - provider_id (e.g., "shippo")
       - amount (display price)
       - data.carrier (e.g., "UPS", "USPS")
       - data.estimated_delivery (if available)

Response Filtered:

     - Only show options with valid amount > 0
     - Sort by price (lowest first) or by carrier preference

Data NEVER Sent to Stripe: N/A (no Stripe interaction)

Error Handling:

     - Empty array → "No shipping available for this address.

Please verify your address." - 500 → "Unable to calculate shipping. Please try again."

---

INTERACTION 4: Apply Shipping Method

Trigger: User selects shipping and clicks "Continue to
Payment"
Caller: Frontend (client-side)
Timing: After user selection
State: SHIPPING_SELECTION → SHIPPING_APPLYING

Request:

     POST /store/carts/{cartId}/shipping-methods
     Headers:
       - x-publishable-api-key: {medusa_publishable_key}
       - Content-Type: application/json
     Body:
     {
       "option_id": "so_01XXXXX"
     }

Response Used:

     - cart.shipping_methods[] (confirm applied)
     - cart.shipping_total (updated)
     - cart.total (final total: subtotal + tax + shipping)

Data NEVER Sent to Stripe: N/A (no Stripe interaction)

Side Effects:

     - Cart total recalculated with shipping
     - Cart is now fully finalized
     - All amounts locked

Error Handling:

     - 400 → "Invalid shipping option. Please select again."
     - 500 → "Unable to apply shipping. Please try again."

---

INTERACTION 5: Create PaymentIntent

Trigger: User confirms order and proceeds to payment
Caller: Frontend (client-side)
Timing: When user clicks "Proceed to Payment"
State: CART_FINALIZED → PAYMENT_INTENT_CREATING

Request:

     POST /api/medusa/payments/create-intent
     Headers:
       - Content-Type: application/json
     Body:
     {
       "cartId": "cart_01XXXXX"
     }

Backend Flow (within endpoint):

     - Fetch cart from Medusa
     - Validate:
       - Has items
       - Has shipping method
       - Has shipping address
       - Has valid total > 0
     - Create Stripe PaymentIntent:

stripe.paymentIntents.create({
amount: Math.round(cart.total),
currency: cart.currency_code,
automatic_payment_methods: { enabled: true },
metadata: {
medusa_cart_id: cart.id,
customer_email: cart.email,
subtotal: cart.subtotal,
tax_total: cart.tax_total,
shipping_total: cart.shipping_total,
item_count: cart.items.length
}
})

Response Used:

     - client_secret (for Stripe Elements)
     - payment_intent_id (for tracking)
     - amount (display for confirmation)
     - currency

Data Sent to Stripe:

     - ✅ amount (final total in cents)
     - ✅ currency
     - ✅ metadata (cart_id, email, breakdown)

Data NEVER Sent to Stripe:

     - ❌ Line items
     - ❌ Product names
     - ❌ Shipping address
     - ❌ Shipping rates
     - ❌ Tax calculations
     - ❌ Discount details

Error Handling:

     - 400 with validation error → Show specific message (e.g.,

"Shipping not selected") - 500 → "Unable to secure payment. Please try again." - Stripe API error → "Payment processor error. Please try
again."

---

INTERACTION 6: Confirm Payment

Trigger: User submits payment via Stripe Elements
Caller: Frontend (client-side → Stripe)
Timing: When user clicks "Pay Now"
State: PAYMENT_READY → PAYMENT_PROCESSING

Request (to Stripe):

     stripe.confirmPayment({
       elements: stripeElements,
       confirmParams: {
         return_url: `${window.location.origin}/checkout/success`
       }
     })

Stripe Behavior:

     - Validates payment details
     - Processes payment
     - Redirects to return_url with payment_intent and

payment_intent_client_secret query params - Fires payment_intent.succeeded webhook to backend

Data Sent to Stripe:

     - ✅ Payment details (via Elements)
     - ✅ Return URL

Data NEVER Sent to Stripe:

     - ❌ Cart items
     - ❌ Address
     - ❌ Shipping details
     - ❌ Tax amounts

Error Handling:

     - Stripe validation error → Show inline error in Elements
     - Payment declined → Redirect to failure page
     - Network error → Show "Payment failed. Please try again."

---

INTERACTION 7: Webhook Processing (Backend)

Trigger: Stripe sends payment_intent.succeeded event
Caller: Stripe → Backend webhook endpoint
Timing: Immediately after payment succeeds
State: Backend-only (no frontend state)

Request (from Stripe):

     POST /api/medusa/webhooks/payment-intent
     Headers:
       - stripe-signature: {webhook_signature}
     Body:
     {
       "type": "payment_intent.succeeded",
       "data": {
         "object": {
           "id": "pi_XXXXX",
           "amount": 139070,
           "currency": "usd",
           "metadata": {
             "medusa_cart_id": "cart_01XXXXX",
             "customer_email": "user@example.com",
             ...
           }
         }
       }
     }

Backend Flow:

     - Verify webhook signature
     - Extract cart_id from metadata
     - Validate cart total:  currentCart = fetch

/store/carts/{cartId}
IF Math.round(currentCart.total) !== paymentIntent.amount
THEN
THROW ERROR "Cart total mismatch" - Complete order in Medusa: POST
/store/carts/{cartId}/complete
Body: { payment_session_id: paymentIntent.id } - Create order in Sanity - Return success

Data Sent to Medusa:

     - ✅ payment_session_id (PaymentIntent ID)

Data NEVER Sent Anywhere:

     - ❌ Stripe payment details
     - ❌ Card numbers
     - ❌ Stripe metadata

Error Handling:

     - Signature verification fails → Return 400, reject webhook
     - Cart total mismatch → Return 400, log error, DO NOT

complete order - Medusa completion fails → Return 500, retry webhook - Sanity creation fails → Log warning, complete anyway
(Medusa is source of truth)

---

INTERACTION 8: Order Completion Response (Frontend)

Trigger: Stripe redirects back after payment
Caller: Browser redirect from Stripe
Timing: After webhook processes
State: PAYMENT_PROCESSING → PAYMENT_SUCCESS

URL Parameters:

     - payment_intent: PaymentIntent ID
     - payment_intent_client_secret: Secret (for verification)

Frontend Flow:

     - Parse URL parameters
     - Call Stripe to verify payment status:

stripe.retrievePaymentIntent(clientSecret) - Check status: - succeeded → Show success page - processing → Show "Processing..." page, poll status - requires_payment_method → Show failure page

No Additional API Calls Needed:

     - Order already created by webhook
     - No need to call Medusa or backend

Display:

     - Success message
     - Order number (fetch from Sanity using PaymentIntent ID)
     - Confirmation email notice

---

4️⃣ Error Handling & Recovery

ERROR CATEGORY 1: Missing Required Data

Missing Address

Detection: SHIPPING_CALCULATION state, no address on cart
User-Facing: "Please enter your shipping address to continue"
System Behavior:

     - Return to ADDRESS_ENTRY state
     - Highlight address form
     - Disable "Continue" button until valid

Recovery Path: User enters address → continues to shipping

---

Missing Shipping Method

Detection: PAYMENT_INTENT_CREATING state, no shipping method
on cart
User-Facing: "Please select a shipping method before payment"
System Behavior:

     - Return to SHIPPING_SELECTION state
     - Highlight shipping options
     - Re-fetch shipping options if needed

Recovery Path: User selects shipping → continues to payment

---

ERROR CATEGORY 2: Calculation Failures

Tax Calculation Failure

Detection: SHIPPING_CALCULATION state, cart has no tax_total
after address update
User-Facing: "Unable to calculate tax for this address. Please
verify your address is correct."
System Behavior:

     - Remain in SHIPPING_CALCULATION state (don't advance)
     - Show error message above address form
     - Provide "Edit Address" button
     - Provide "Try Again" button

Recovery Path:

     - User edits address → resubmits
     - OR user clicks Try Again → re-fetch cart

Escalation: If persists after 3 attempts, show "Contact
Support" option

---

Shipping Options Load Failure

Detection: SHIPPING_CALCULATION state, API returns error or
empty array
User-Facing:

     - Empty array: "No shipping available to this address.

Please verify your address or contact support." - API error: "Unable to calculate shipping. Please try
again."

System Behavior:

     - Show error message
     - Provide "Edit Address" button
     - Provide "Retry" button

Recovery Path:

     - User edits address → resubmits → re-fetches shipping
     - OR user clicks Retry → re-fetch shipping options

Escalation: Show "Contact Support" with address details

---

ERROR CATEGORY 3: Payment Failures

PaymentIntent Creation Failure

Detection: PAYMENT_INTENT_CREATING state, API returns error
User-Facing: "Unable to secure payment. Please try again or
contact support."
System Behavior:

     - Remain in CART_FINALIZED state (don't lock cart)
     - Show error message
     - Log error details (not shown to user)
     - Provide "Try Again" button
     - Provide "Start Over" button

Recovery Path:

     - User clicks Try Again → retry PaymentIntent creation
     - OR user clicks Start Over → return to cart

Escalation: If fails 3 times, show "Contact Support"

---

Stripe Payment Declined

Detection: PAYMENT_PROCESSING state, Stripe returns decline
error
User-Facing: Display Stripe's decline message (e.g., "Card
declined. Please use a different payment method.")
System Behavior:

     - Return to PAYMENT_READY state (cart still locked)
     - Show error message from Stripe
     - Allow user to re-enter payment details
     - Allow retry with same PaymentIntent

Recovery Path:

     - User updates payment method → retries payment
     - OR user clicks "Start Over" → create new cart

Important: PaymentIntent can be reused for multiple attempts

---

Stripe Network Error

Detection: PAYMENT_PROCESSING state, network timeout or
connection error
User-Facing: "Payment could not be processed due to a
connection error. Please try again."
System Behavior:

     - Remain in PAYMENT_READY state
     - Show error message
     - Enable "Try Again" button
     - Do NOT create new PaymentIntent

Recovery Path: User clicks Try Again → retry confirmation

---

ERROR CATEGORY 4: Cart Mutation Detection

Cart Total Mismatch (Webhook)

Detection: Webhook handler, cart.total ≠ paymentIntent.amount
User-Facing: "Your order could not be completed due to a
pricing error. Please restart checkout."
System Behavior:

     - DO NOT complete order in Medusa
     - Log error with full details:  {
         error: "Cart total mismatch",
         cart_id: "cart_01XXXXX",
         current_total: 139070,
         intent_amount: 125000,
         difference: 14070,
         timestamp: "2026-01-31T16:30:00Z"
       }
     - Return 400 to Stripe webhook
     - User sees payment failure on frontend

Recovery Path:

     - User must start over with new cart
     - Previous PaymentIntent is abandoned

Escalation: Alert system administrators to investigate

---

Cart Emptied During Checkout

Detection: Any state, cart fetch returns no items
User-Facing: "Your cart is empty. Please add items to
checkout."
System Behavior:

     - Transition to CART_EMPTY state
     - Abandon any in-progress PaymentIntent
     - Show "Return to Store" button

Recovery Path: User navigates back to store

---

ERROR CATEGORY 5: Session/State Errors

Cart Not Found

Detection: CART_LOADING state, API returns 404
User-Facing: "Cart not found. Your session may have expired."
System Behavior:

     - Show error message
     - Provide "Start New Cart" button
     - Provide "Return to Store" button

Recovery Path: User starts new shopping session

---

Stale State (User Refreshes Page)

Detection: Any state, page refresh
User-Facing: None (transparent recovery)
System Behavior:

     - Re-fetch cart from Medusa
     - Determine state based on cart data:
       - Has items, no address → ADDRESS_ENTRY
       - Has items, has address, no shipping → SHIPPING_SELECTION
       - Has items, has address, has shipping → CART_FINALIZED
       - Has items, PaymentIntent exists → PAYMENT_READY

Recovery Path: Automatic, user continues from current state

Important: Check for existing PaymentIntent:

     - If cart has payment_session_id → recover to PAYMENT_READY
     - If no PaymentIntent → allow normal flow

---

GENERAL ERROR HANDLING PRINCIPLES

User-Facing Messages

     - Be Specific: "Shipping method not selected" not "Invalid

cart state" - Be Actionable: Always provide next steps or buttons - Be Honest: Don't hide errors, explain what went wrong - Be Helpful: Provide "Contact Support" for unrecoverable
errors

System Behavior

     - Log Everything: Error details, state, cart contents, user

actions - Don't Silently Fail: Always show feedback - Allow Retry: Most errors should be retryable - Preserve State: Don't lose user's progress unnecessarily

Escalation Path

     - Error occurs → User-facing message + recovery options
     - Error persists (3 attempts) → Show "Contact Support"
     - Support contact includes:
       - Error message
       - Cart ID
       - User email
       - Timestamp
       - State when error occurred

---

5️⃣ UX Constraints (Non-Visual)

LAYOUT STRUCTURE (Conceptual)

Primary Content Area

Contains: Checkout flow forms and state-dependent content

Progressive Disclosure:

     - Show only current step's inputs
     - Grey out or hide future steps
     - Show completed steps as read-only cards with edit option

State-Based Content:

     - ADDRESS_ENTRY: Address form (primary focus)
     - SHIPPING_SELECTION: Shipping options (primary focus)
     - CART_FINALIZED: Order summary (primary focus)
     - PAYMENT_READY: Payment form (primary focus)

---

Secondary Content Area

Contains: Order summary sidebar/panel

Always Visible (except in CART_EMPTY):

     - Line items with quantities
     - Subtotal
     - Shipping (when available)
     - Tax (when available)
     - Total

Dynamic Behavior:

     - Updates in real-time as user progresses
     - Shows "Calculating..." indicators during API calls
     - Highlights changes (e.g., shipping added, tax updated)

---

BUTTON STATES

Primary Action Button (e.g., "Continue", "Pay Now")

Enabled When:

     - Current state validation passes
     - No API call in progress
     - Required fields completed

Disabled When:

     - Validation fails
     - API call in progress
     - Required fields incomplete

Visual Feedback:

     - Loading spinner when processing
     - Success checkmark when action succeeds (briefly before

transition) - Error indicator if action fails

---

Secondary Action Buttons (e.g., "Edit Address")

Enabled When:

     - State allows editing
     - Before PAYMENT_INTENT_CREATING

Disabled When:

     - After PAYMENT_INTENT_CREATING (cart locked)

Behavior:

     - Before lock: Show warning modal if cart is finalized
     - After lock: Show "Cannot edit" message with "Start Over"

option

---

LOADING STATES

Instant Feedback (0-100ms)

What: Button click acknowledgment
How: Button visual state change (pressed appearance)
Why: User needs immediate confirmation of click

---

Fast Async (100ms-1s)

What: Form validation, local state changes
How: Inline validation messages, field highlighting
Why: Keeps flow feeling responsive

Examples:

     - Address field validation
     - Shipping selection

---

Slow Async (1s-3s)

What: API calls to Medusa
How: Loading spinner, progress indicator, "Calculating..."
text
Why: User needs to know system is working

Examples:

     - Address submission
     - Shipping options fetch
     - PaymentIntent creation

Display Requirements:

     - Show what's being calculated (e.g., "Calculating

shipping...") - Disable form inputs during loading - Show spinner or progress bar

---

Very Slow Async (3s+)

What: Payment processing
How: Full-page loading state with reassuring message
Why: User needs to wait and not refresh

Examples:

     - Stripe payment confirmation

Display Requirements:

     - "Processing payment..." message
     - Spinner
     - "Do not close this page" warning
     - Disable all interactions

---

PROGRESS INDICATION

Conceptual Steps (Not Visual Stepper)

User Mental Model:

     - Enter Address
     - Choose Shipping
     - Review Order
     - Pay

How to Indicate Progress:

     - Current step is active/editable
     - Previous steps are collapsed/read-only
     - Future steps are inactive/disabled

Do NOT:

     - Use step numbers (steps can be revisited)
     - Use linear progress bar (flow is not always forward)

---

BLOCKING BEHAVIOR

Blocks That Must Feel Instant

     - Address field typing
     - Shipping option selection (radio button)
     - Form validation feedback

Implementation: Client-side only, no API calls

---

Blocks That Can Be Async

     - Address submission (calculates tax)
     - Shipping application (updates total)
     - PaymentIntent creation

Implementation: Show loading, block progress, allow
cancellation

---

Blocks That Cannot Proceed

User Cannot Advance If:

     - Required fields incomplete
     - API call failed
     - Validation failed

User Feedback:

     - Disable "Continue" button
     - Show inline error messages
     - Highlight missing/invalid fields

---

EDIT BEHAVIOR

Before Cart Lock (States before PAYMENT_INTENT_CREATING)

User Can:

     - Edit any completed step
     - Return to previous step
     - Change selections

System Behavior:

     - Show warning if cart is finalized: "This will recalculate

your order" - Clear downstream data (e.g., editing address clears
shipping selection) - Recalculate from edited point forward

User Experience:

     - Feels flexible
     - Allows corrections
     - Gives control

---

After Cart Lock (States after PAYMENT_INTENT_CREATING)

User Cannot:

     - Edit address
     - Edit shipping
     - Edit cart items
     - Apply discounts

System Behavior:

     - Hide edit buttons
     - Show "locked" indicator
     - Display read-only summary

User Experience:

     - Feels secure
     - Indicates commitment
     - Prevents confusion

Recovery:

     - Provide "Start Over" option
     - Creates new cart
     - Abandons current session

---

CART SUMMARY BEHAVIOR

Dynamic Updates

When: After any API call that changes totals
What Updates:

     - Shipping cost (when applied)
     - Tax (when address entered)
     - Total (when shipping applied)

How to Indicate:

     - Highlight changed value briefly (e.g., flash or color

change) - Show "+$X.XX" indicator next to new values - Animate number changes

---

Breakdown Visibility

Always Show:

     - Line items
     - Subtotal
     - Total

Show When Available:

     - Shipping cost (after method selected)
     - Tax (after address entered)
     - Discounts (if applied)

Labels:

     - Use clear labels: "Shipping: UPS Ground - $15.00"
     - Show "Calculating..." for pending values
     - Show "Not yet calculated" for future values

---

6️⃣ Mapping to Known Issues

ISSUE 1: USPS Appearing as Option

Problem: USPS shows as shipping option but shouldn't
Root Cause: Frontend not filtering shipping options by carrier

Design Solution:

     - State: SHIPPING_SELECTION
     - Behavior: Filter shipping_options array before display
     - Filter Logic:   validCarriers = ["UPS", "USPS"] // or from
    config
       displayOptions = options.filter(opt =>
         validCarriers.includes(opt.data?.carrier?.toUpperCase())
       )
     - User Experience: Only valid carriers shown, invalid

options never rendered

Why This Prevents It:

     - Filtering happens client-side before display
     - Invalid options never reach user
     - Can be configured per deployment

---

ISSUE 2: Incorrect Tax Totals

Problem: Tax amounts don't match expected calculations
Root Cause: Tax calculated by Stripe OR calculated before
address entered

Design Solution:

     - State: SHIPPING_CALCULATION
     - Behavior: Tax calculated by Medusa ONLY after address

submitted - Display Logic: - Before address: Show "Tax: Calculated at checkout" - After address: Show "Tax: $X.XX (based on CA)" with
address indicator - Source of Truth: Medusa's cart.tax_total field

Why This Prevents It:

     - Tax never sent to Stripe (Stripe doesn't calculate)
     - Tax always based on user's address (not default)
     - Tax calculation happens exactly once (when address

submitted) - No tax drift from multiple calculations

---

ISSUE 3: Multiplying Cart Items

Problem: Items appear duplicated or quantities multiply
Root Cause: Multiple API calls adding same item OR webhook
duplicating orders

Design Solution:

     - Prevention Point 1: Frontend State Machine
       - Only ONE shipping method application per session
       - API calls blocked after PAYMENT_INTENT_CREATING
       - No re-entry to earlier states without starting over
     - Prevention Point 2: Cart Lock
       - Cart becomes immutable at PAYMENT_INTENT_CREATING
       - Line item APIs blocked after lock
       - UI prevents user from triggering duplicate adds
     - Prevention Point 3: Webhook Idempotency
       - Check if order exists before creating
       - Use PaymentIntent ID as idempotency key
       - Query: *[_type == "order" && stripePaymentIntentId ==

$id][0]

Why This Prevents It:

     - Cart cannot be modified during payment flow
     - Orders only created once (idempotent webhook)
     - No path for duplicate creation

---

ISSUE 4: Laggy Delivery Option Selection

Problem: Shipping selection feels slow or unresponsive
Root Cause: API call happening on selection instead of on
confirmation

Design Solution:

     - State: SHIPPING_SELECTION
     - Selection Behavior: Instant (client-side only)
       - User clicks radio button → immediate visual feedback
       - No API call on click
       - Selected option stored in local state only
     - Confirmation Behavior: Async when user proceeds
       - User clicks "Continue to Payment" → API call starts
       - Show loading: "Applying shipping method..."
       - Apply shipping via API: POST

/store/carts/{id}/shipping-methods

Why This Prevents It:

     - Selection feels instant (no network delay)
     - API call only when user commits
     - Clear loading indicator when async work happens

---

ISSUE 5: Product Duplication Tied to Shipping Price

Problem: Products duplicate when shipping is calculated
Root Cause: Shipping calculation triggering cart mutation

Design Solution:

     - Separation of Concerns:
       - Shipping fetch: GET /store/shipping-options (read-only,

no cart mutation) - Shipping apply: POST /store/carts/{id}/shipping-methods
(write, updates total only) - API Call Order: - Fetch shipping options (display only) - User selects option (local state) - Apply selected option (single API call) - Cart Mutation Guard: - Only ONE shipping method per checkout session - Re-applying shipping replaces previous (not adds) - Medusa should handle replacement, not addition

Why This Prevents It:

     - Shipping fetch doesn't touch cart
     - Shipping apply is idempotent (replace, not add)
     - No mechanism for duplication via shipping

---

ISSUE 6: Discounts Not Clearly Reflected

Problem: Discount codes applied but not visible in total
breakdown
Root Cause: UI not showing discount line item

Design Solution:

     - Display Requirement: Order summary must show:  Subtotal:
           $100.00
       Discount (CODE10): -$10.00
       Shipping:          $15.00
       Tax:               $7.35
       ──────────────────────────
       Total:             $112.35
     - Data Source: cart.discount_total and cart.discounts[] from
    Medusa
     - State Logic:
       - Show discount input ONLY in ADDRESS_ENTRY and

SHIPPING_SELECTION states - After CART_FINALIZED, hide input, show applied discounts
only - After PAYMENT_INTENT_CREATING, discount locked (no
changes)

Why This Prevents It:

     - Discount always visible in breakdown
     - Discount applied before payment (can't change after lock)
     - Clear label shows discount code used

---

CROSS-ISSUE PREVENTION: Single Source of Truth

Principle: All displayed amounts come from Medusa cart object

Implementation:

     Display Logic:
     - Subtotal → cart.subtotal
     - Shipping → cart.shipping_total
     - Tax → cart.tax_total
     - Discount → cart.discount_total
     - Total → cart.total

     NEVER:
     - Calculate totals client-side
     - Store totals in local state
     - Derive totals from individual items

Why This Prevents Issues:

     - No drift between display and actual
     - No calculation errors
     - No stale data
     - All issues visible in one place (Medusa cart)

---

📋 Implementation Checklist

Phase 1 Frontend Developer should implement:

     - [ ]  State machine with all 13 states
     - [ ]  State transition logic
     - [ ]  Cart lock enforcement (disable APIs after

PAYMENT_INTENT_CREATING) - [ ] Address form with validation - [ ] Shipping selection with radio buttons - [ ] Order summary component - [ ] Stripe Elements integration - [ ] Error handling for all scenarios - [ ] Loading states for all async operations - [ ] Cart mutation detection on page refresh - [ ] Webhook success handling (redirect from Stripe)

Backend is already implemented:

     - ✅ PaymentIntent creation endpoint
     - ✅ Webhook handler with cart validation
     - ✅ Medusa order completion

Configuration required:

     - [ ]  Set STRIPE_WEBHOOK_SECRET in environment
     - [ ]  Configure Stripe webhook endpoint in dashboard
     - [ ]  Test end-to-end flow in staging

---

END OF SPECIFICATION

This specification is ready for implementation. All states,
transitions, API calls, and error scenarios are defined. The
design prevents all known issues through explicit state
management and cart locking.
