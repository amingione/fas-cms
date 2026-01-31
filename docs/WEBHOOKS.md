# Active Webhooks - FAS Motorsports

**Last Updated:** 2026-01-31  
**Status:** Production Active  
**Phase:** Post Phase 3 Cleanup

---

## Purpose

This document maintains an inventory of **all active webhooks** in the FAS Motorsports platform. This includes:

- Webhook URLs and endpoints
- Events handled
- Secrets required
- Processing logic
- Dependencies
- Security notes

**This is a LIVING DOCUMENT** - update when webhooks are added, modified, or removed.

---

## Active Webhooks

### 1. Stripe PaymentIntent Webhook (PRIMARY)

**Status:** ✅ ACTIVE - Primary Payment Flow

**URL:** `https://yourdomain.com/api/medusa/webhooks/payment-intent`

**Events Handled:**
- `payment_intent.succeeded` - Payment completed successfully
- `payment_intent.payment_failed` - Payment declined or failed

**Webhook Secret:**
- Environment Variable: `STRIPE_WEBHOOK_SECRET`
- Configured In: Stripe Dashboard → Webhooks
- Rotation: Required on secret compromise

**Processing Logic:**
1. Validates Stripe signature using `STRIPE_WEBHOOK_SECRET`
2. Extracts `medusa_cart_id` from `metadata`
3. Fetches cart from Medusa
4. **Validates cart total matches payment intent amount** (prevents mutation)
5. Completes order in Medusa (authoritative)
6. Mirrors order to Sanity (read-only + ops annotations)
7. Sends confirmation email via Resend

**Dependencies:**
- `STRIPE_WEBHOOK_SECRET` (environment variable)
- `MEDUSA_BACKEND_URL` (Medusa API)
- `MEDUSA_ADMIN_API_TOKEN` (Medusa authentication)
- `SANITY_API_TOKEN` (Sanity write access)
- `RESEND_API_KEY` (email notifications)

**Security Notes:**
- Signature verification is MANDATORY (prevents replay attacks)
- Cart mutation detection prevents total drift
- Failed validation returns 400 (payment NOT completed)
- Idempotent: can be retried safely

**Related Files:**
- `src/pages/api/medusa/webhooks/payment-intent.ts` (handler)
- `docs/checkout/checkout-flow-spec.md` (specification)

**Testing:**
- Stripe CLI: `stripe trigger payment_intent.succeeded`
- Test Cards: `4242 4242 4242 4242` (success), `4000 0000 0000 0002` (decline)

---

### 2. Stripe Shipping Webhook (OPTIONAL)

**Status:** ⚠️ CONDITIONAL - Only if using Stripe shipping rates

**URL:** `https://yourdomain.com/api/stripe/webhooks/shipping`

**Events Handled:**
- `checkout.session.completed` (if using legacy Stripe Checkout)
- Custom shipping rate events (if applicable)

**Webhook Secret:**
- Environment Variable: `STRIPE_SHIPPING_WEBHOOK_SECRET`
- Configured In: Stripe Dashboard → Webhooks
- Separate from `STRIPE_WEBHOOK_SECRET`

**Processing Logic:**
- Depends on implementation
- **NOTE:** In new Medusa-first architecture, shipping is calculated in Medusa, NOT Stripe
- This webhook may be legacy/unused

**Dependencies:**
- `STRIPE_SHIPPING_WEBHOOK_SECRET` (environment variable)
- May depend on legacy flow

**Security Notes:**
- If unused, consider removing from Stripe Dashboard
- If active, ensure signature verification

**Status Check:**
- Review if this webhook is actually processing events
- Consider deprecating in favor of Medusa shipping only

---

### 3. Shippo Tracking Webhook (OPTIONAL)

**Status:** ⚠️ CONDITIONAL - Only if `SHIPPO_WEBHOOKS_ENABLED=true`

**URL:** `https://yourdomain.com/api/shippo/webhooks/tracking` (example)

**Events Handled:**
- `track_updated` - Tracking status changes
- `delivery_completed` - Package delivered
- `delivery_failed` - Delivery exception

**Webhook Secret:**
- Environment Variable: `SHIPPO_WEBHOOK_SECRET` (if used)
- Configured In: Shippo Dashboard → Webhooks

**Processing Logic:**
1. Receives tracking status update
2. Updates order fulfillment status in Medusa
3. Mirrors status to Sanity
4. May trigger customer notification emails

**Dependencies:**
- `SHIPPO_API_KEY` (Shippo authentication)
- `MEDUSA_BACKEND_URL` (Medusa API)
- `SANITY_API_TOKEN` (Sanity write access)
- `RESEND_API_KEY` (email notifications)

**Security Notes:**
- Verify Shippo webhook signature if available
- Validate tracking number exists before updating
- Idempotent: can be retried safely

**Status Check:**
- Confirm if Shippo webhooks are actively used
- Check `SHIPPO_WEBHOOKS_ENABLED` environment variable

---

## Legacy Webhooks (ARCHIVED)

### 🚫 Stripe Checkout Session Webhook (DEPRECATED)

**Status:** ❌ ARCHIVED - DO NOT USE

**Original URL:** `https://yourdomain.com/api/webhooks`

**Events Handled:**
- `checkout.session.completed` (legacy Stripe Checkout flow)

**Archived:** 2026-01-31  
**Reason:** 
- Used legacy Stripe Checkout Sessions (not PaymentIntents)
- Created orders directly in Sanity (violated authority model)
- No cart mutation validation
- Replaced by PaymentIntent webhook

**Migration:**
- New webhook: `/api/medusa/webhooks/payment-intent`
- Orders now created in Medusa first
- Cart mutation detection added
- Sanity mirrors read-only state

**Safe to Remove From Stripe Dashboard:**
- After confirming no legacy Checkout Session orders pending
- After validating new PaymentIntent webhook is working
- Estimated: 2026-07-31 (6 months after archive)

**Related Files:**
- `src/pages/api/legacy/webhooks.ts` (archived handler)
- `src/pages/api/legacy/README.md` (archive documentation)

---

## Webhook Configuration Checklist

When adding or modifying webhooks:

### Development Setup
- [ ] Create webhook endpoint in `/api/*`
- [ ] Add signature verification
- [ ] Implement idempotent processing
- [ ] Add error handling and logging
- [ ] Test with webhook provider CLI/sandbox

### Stripe Dashboard Configuration
- [ ] Add webhook URL in Stripe Dashboard
- [ ] Select specific events (minimize event noise)
- [ ] Copy webhook signing secret
- [ ] Add secret to environment variables
- [ ] Test with Stripe CLI trigger
- [ ] Verify events appear in Dashboard logs

### Shippo Dashboard Configuration
- [ ] Add webhook URL in Shippo Dashboard
- [ ] Select tracking events
- [ ] Copy webhook secret (if available)
- [ ] Test with sample tracking number
- [ ] Verify events appear in Dashboard logs

### Environment Variables
- [ ] Add webhook secret to `.env`
- [ ] Add secret to `.env.canonical` documentation
- [ ] Add secret to deployment environment (Netlify/Vercel)
- [ ] Document in this file (WEBHOOKS.md)

### Security Validation
- [ ] Signature verification implemented
- [ ] Replay attack prevention (idempotency keys)
- [ ] Rate limiting (if needed)
- [ ] Error logging (without exposing secrets)
- [ ] Timeout handling (fail gracefully)

### Documentation
- [ ] Update this WEBHOOKS.md file
- [ ] Document in API reference (if applicable)
- [ ] Add to runbook/ops guide
- [ ] Include in disaster recovery plan

---

## Webhook Testing

### Stripe PaymentIntent Webhook

**Test with Stripe CLI:**
```bash
# Install Stripe CLI (if not already installed)
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local development
stripe listen --forward-to http://localhost:4321/api/medusa/webhooks/payment-intent

# Trigger test event
stripe trigger payment_intent.succeeded
```

**Test with cURL:**
```bash
# This will fail signature verification (expected)
curl -X POST http://localhost:4321/api/medusa/webhooks/payment-intent \
  -H "Content-Type: application/json" \
  -d '{"type": "payment_intent.succeeded", "data": {...}}'
```

**Production Testing:**
- Use Stripe Dashboard → Webhooks → [Your Webhook] → "Send test webhook"
- Monitor webhook logs in Stripe Dashboard
- Check application logs for processing errors

### Shippo Tracking Webhook

**Test with Shippo Dashboard:**
- Create test shipment with tracking
- Update tracking status manually
- Verify webhook fires and updates order

**Test with cURL:**
```bash
curl -X POST http://localhost:4321/api/shippo/webhooks/tracking \
  -H "Content-Type: application/json" \
  -d '{"event": "track_updated", "data": {...}}'
```

---

## Webhook Monitoring

### Health Checks

**Stripe:**
- Check Stripe Dashboard → Webhooks → [Your Webhook]
- Review "Recent deliveries" for failures
- Check "Response" tab for 2xx status codes
- Review "Attempts" for retry behavior

**Shippo:**
- Check Shippo Dashboard → Webhooks
- Review delivery logs
- Verify tracking updates are processed

**Application Logs:**
- Monitor webhook processing logs
- Check for signature verification failures
- Review error rates and retry attempts
- Alert on high failure rates

### Common Issues

**Problem:** Webhook fails signature verification  
**Solution:** 
- Verify `STRIPE_WEBHOOK_SECRET` matches Stripe Dashboard
- Check secret wasn't accidentally rotated
- Confirm using correct secret for endpoint (not publishable key)

**Problem:** Webhook timeout  
**Solution:**
- Reduce processing time (move heavy work to background job)
- Return 200 immediately, process asynchronously
- Increase timeout in webhook provider settings

**Problem:** Duplicate webhook processing  
**Solution:**
- Implement idempotency keys
- Check if order already exists before creating
- Use database transactions to prevent race conditions

**Problem:** Webhook not firing  
**Solution:**
- Verify webhook is active in provider dashboard
- Check endpoint URL is correct (no typos)
- Test with provider CLI/test tools
- Review firewall/security rules

---

## Webhook Rotation Schedule

Webhook secrets should be rotated regularly for security:

**Recommended Schedule:**
- **Production Secrets:** Every 6 months
- **After Security Incident:** Immediately
- **After Team Departure:** Within 7 days

**Rotation Process:**
1. Generate new secret in webhook provider dashboard
2. Add new secret to environment (keep old secret temporarily)
3. Update application to validate against both secrets
4. Deploy application
5. Update webhook provider to use new secret
6. Monitor for failures (should be zero)
7. Remove old secret from environment
8. Document rotation in change log

---

## Security Best Practices

### Signature Verification
- ✅ ALWAYS verify webhook signatures
- ✅ Use provider SDK for verification (don't roll your own)
- ✅ Reject webhooks with invalid signatures (400 error)
- ✅ Log signature failures for security monitoring

### Secrets Management
- ✅ Store secrets in environment variables (not code)
- ✅ Use secret managers in production (AWS Secrets Manager, Netlify Environment Variables)
- ✅ Never commit secrets to git
- ✅ Rotate secrets regularly

### Error Handling
- ✅ Return 200 for successfully processed webhooks
- ✅ Return 400 for invalid/malformed webhooks
- ✅ Return 500 for transient errors (triggers retry)
- ✅ Implement exponential backoff for retries

### Data Validation
- ✅ Validate webhook payload schema
- ✅ Validate referenced IDs exist (cart_id, order_id)
- ✅ Validate amounts match expected values
- ✅ Validate state transitions are valid

### Idempotency
- ✅ Use idempotency keys to prevent duplicate processing
- ✅ Store processed webhook IDs in database
- ✅ Return success for already-processed webhooks
- ✅ Design operations to be safely retriable

---

## Related Documentation

**Architecture:**
- `docs/checkout/checkout-flow-spec.md` - Checkout flow specification
- `docs/STEP2_ALIGNMENT_AUDIT.md` - Authority model alignment
- `fas-sanity/docs/office-dashboard-role-definition.md` - Sanity role definition

**Implementation:**
- `src/pages/api/medusa/webhooks/payment-intent.ts` - Primary webhook handler
- `src/pages/api/legacy/webhooks.ts` - Archived legacy webhook
- `src/pages/api/legacy/README.md` - Legacy route documentation

**Environment:**
- `.env.canonical` - Canonical environment variable reference
- `docs/PHASE3_ARCHIVAL_LOG.md` - Phase 3 cleanup log

---

**Document Version:** 1.0  
**Last Review:** 2026-01-31  
**Next Review:** 2026-04-30 (quarterly)  
**Maintained By:** Engineering Team
