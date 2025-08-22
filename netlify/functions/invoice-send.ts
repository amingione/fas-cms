import type { Handler } from '@netlify/functions';
import { requireUser } from './_auth';
import { stripe } from './_stripe';

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    requireUser(event);
    const { invoiceId } = JSON.parse(event.body || '{}');
    if (!invoiceId) return { statusCode: 400, body: 'Missing invoiceId' };
    const sent = await stripe.invoices.sendInvoice(invoiceId);
    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, hostedInvoiceUrl: sent.hosted_invoice_url })
    };
  } catch (e: any) {
    return { statusCode: e.statusCode || 500, body: e.message || 'Send failed' };
  }
};
