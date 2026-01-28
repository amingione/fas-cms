import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { requireVendor } from '@/server/vendor-portal/auth';
import { sanity } from '@/server/sanity-client';
import { jsonResponse } from '@/server/http/responses';
import { vendorInvoicePaySchema } from '@/lib/validators/api-requests';
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
    const bodyResult = vendorInvoicePaySchema.safeParse(await request.json());
    if (!bodyResult.success) {
      console.error('[validation-failure]', {
        schema: 'vendorInvoicePaySchema',
        context: 'api/vendor/invoices/pay',
        identifier: id || 'unknown',
        timestamp: new Date().toISOString(),
        errors: bodyResult.error.format()
      });
      return jsonResponse(
        { error: 'Validation failed', details: bodyResult.error.format() },
        { status: 422 },
        { noIndex: true }
      );
    }
    const { amount, paymentMethodId } = bodyResult.data;

    const invoice = await sanity.fetch(
      '*[_type == "invoice" && _id == $id && references($vendorId)][0]',
      { id, vendorId: ctx.vendorId }
    );
    if (!invoice) {
      return jsonResponse({ message: 'Invoice not found' }, { status: 404 }, { noIndex: true });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(Number(amount) * 100),
      currency: 'usd',
      payment_method: paymentMethodId,
      confirm: true,
      metadata: {
        invoiceId: invoice._id,
        vendorId: ctx.vendorId
      }
    });

    const newPaid = (Number(invoice.amountPaid) || 0) + Number(amount);
    const newStatus = newPaid >= Number(invoice.total || 0) ? 'paid' : 'partial';

    await sanity
      .patch(invoice._id)
      .set({
        amountPaid: newPaid,
        status: newStatus
      })
      .commit();

    await sanity.create({
      _type: 'vendorNotification',
      vendor: { _type: 'reference', _ref: ctx.vendorId },
      type: 'payment',
      title: 'Payment Processed',
      message: `Payment of $${amount} for invoice ${invoice.invoiceNumber || invoice._id} processed.`,
      link: `/vendor-portal/invoices/${invoice._id}`,
      read: false,
      createdAt: new Date().toISOString()
    });

    return jsonResponse({ success: true, paymentIntent }, { status: 200 }, { noIndex: true });
  } catch (err: any) {
    console.error('[vendor invoice pay] failed', err);
    return jsonResponse({ message: err?.message || 'Payment failed' }, { status: 400 }, { noIndex: true });
  }
};
