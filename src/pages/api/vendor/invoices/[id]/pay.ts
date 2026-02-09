import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { requireVendor } from '@/server/vendor-portal/auth';
import { sanity } from '@/server/sanity-client';
import { jsonResponse } from '@/server/http/responses';
import { STRIPE_API_VERSION } from '@/lib/stripe-config';

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
