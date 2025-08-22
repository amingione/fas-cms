import type { Handler } from '@netlify/functions';
import { stripe } from './_stripe';
import { sanity } from './_sanity';
import { requireUser } from './_auth';

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    requireUser(event);
    const { quoteId } = JSON.parse(event.body || '{}');
    if (!quoteId) return { statusCode: 400, body: 'Missing quoteId' };

    const quote = await sanity.fetch(`*[_type=="quote" && _id==$id][0]`, { id: quoteId });
    if (!quote) return { statusCode: 404, body: 'Quote not found' };

    // Create/fetch Stripe customer
    const customer = await stripe.customers.create({
      email: quote.customerEmail,
      name: quote.customerName
    });

    // Create draft invoice + items
    const invoice = await stripe.invoices.create({
      customer: customer.id,
      collection_method: 'send_invoice',
      days_until_due: 7
    });
    for (const it of quote.items || []) {
      await stripe.invoiceItems.create({
        customer: customer.id,
        amount: Math.round(Number(it.price || 0) * 100),
        quantity: Number(it.qty || 1),
        currency: 'usd',
        description: it.title || it.sku || 'Item',
        invoice: invoice.id
      });
    }
    if (typeof invoice.id !== 'string') {
      throw new Error('Invoice ID is missing or invalid');
    }
    const finalized = await stripe.invoices.finalizeInvoice(invoice.id);

    // Persist linkage in Sanity
    await sanity.patch(quoteId).set({ status: 'invoiced', stripeInvoiceId: finalized.id }).commit();

    return {
      statusCode: 200,
      body: JSON.stringify({
        invoiceId: finalized.id,
        hostedInvoiceUrl: finalized.hosted_invoice_url
      })
    };
  } catch (e: any) {
    return { statusCode: e.statusCode || 500, body: e.message || 'Convert failed' };
  }
};
