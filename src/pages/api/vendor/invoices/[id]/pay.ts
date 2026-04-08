import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { requireVendor } from '@/server/vendor-portal/auth';
import { sanity } from '@/server/sanity-client';
import { jsonResponse } from '@/server/http/responses';
import { STRIPE_API_VERSION } from '@/lib/stripe-config';

/**
 * Vendor Invoice Payment — B2B/Vendor Exception
 *
 * ARCHITECTURE EXCEPTION (Approved):
 * This route calls the Stripe SDK directly to retrieve a PaymentIntent
 * for a vendor invoice. This is an explicitly approved B2B/vendor exception
 * to the standard rule that all Stripe interactions go through Medusa.
 *
 * Exception boundary:
 * - Scope: Vendor portal only — never accessible to customer checkout paths.
 * - Purpose: Retrieve an existing PaymentIntent created by the vendor billing system
 *   (not by customer checkout) so the vendor can pay an outstanding invoice.
 * - Authority: Vendor invoices are billed outside the Medusa storefront flow.
 *   They are created server-side with Stripe and stored in Sanity with a
 *   stripePaymentIntentId reference.
 * - Not applicable to: any customer-facing checkout, cart, or order flow.
 *
 * Governance: WS1-1 — fas-cms-fresh authority boundary (B2B exception documented).
 * See docs/governance/REPO_GOVERNANCE.md for full exception boundary definition.
 */

const stripeSecret = process.env.STRIPE_SECRET_KEY || (import.meta as any).env?.STRIPE_SECRET_KEY;
const stripe = stripeSecret
  ? new Stripe(stripeSecret, { apiVersion: STRIPE_API_VERSION as Stripe.LatestApiVersion })
  : null;

export const POST: APIRoute = async ({ params, request }) => {
  const ctx = await requireVendor(request, 'view_payments');
  if (!ctx.ok) return ctx.response;

  if (!stripe) {
    return jsonResponse({ message: 'Stripe not configured' }, { status: 500 }, { noIndex: true });
  }

  try {
    const { id } = params;
    const invoice = await sanity.fetch(
      '*[_type == "invoice" && _id == $id && vendorRef._ref == $vendorId][0]{_id, status, stripePaymentIntentId}',
      { id, vendorId: ctx.vendorId }
    );
    if (!invoice) {
      return jsonResponse({ message: 'Invoice not found' }, { status: 404 }, { noIndex: true });
    }

    if (invoice.status === 'paid') {
      return jsonResponse(
        { message: 'Invoice is already paid.' },
        { status: 409 },
        { noIndex: true }
      );
    }

    if (!invoice.stripePaymentIntentId) {
      return jsonResponse(
        { message: 'PaymentIntent missing for this invoice.' },
        { status: 409 },
        { noIndex: true }
      );
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(invoice.stripePaymentIntentId);

    return jsonResponse(
      { success: true, paymentIntentId: paymentIntent.id, clientSecret: paymentIntent.client_secret },
      { status: 200 },
      { noIndex: true }
    );
  } catch (err: any) {
    console.error('[vendor invoice pay] failed', err);
    return jsonResponse({ message: err?.message || 'Payment failed' }, { status: 400 }, { noIndex: true });
  }
};
