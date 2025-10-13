import type { Handler } from '@netlify/functions';
import { requireUser } from './_auth';
import { sanity } from './_sanity';
import { stripe } from './_stripe';
// Stripe will email invoices; no external mailer needed here

const json = (statusCode: number, body: any) => ({
  statusCode,
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body)
});

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method Not Allowed' });
    await requireUser(event);
    const body = JSON.parse(event.body || '{}');
    const quoteId: string | undefined = body.quoteId;
    if (!quoteId) return json(400, { error: 'Missing quoteId' });

    // Load quote from Sanity
    const quote = await sanity.fetch(
      `*[_type=="quote" && _id==$id][0]{ _id, number, customerName, customerEmail, items, status, stripeInvoiceId }`,
      { id: quoteId }
    );
    if (!quote) return json(404, { error: 'Quote not found' });
    if (!quote.customerEmail) return json(400, { error: 'Missing customerEmail' });

    let invoiceId: string | undefined = quote.stripeInvoiceId;
    let hostedInvoiceUrl: string | undefined;
    let invoiceNumber: string | undefined;
    let invoiceTotal: number | undefined;

    // Create invoice in Stripe if needed
    if (!invoiceId) {
      const customer = await stripe.customers.create({
        email: quote.customerEmail,
        name: quote.customerName || undefined
      });
      const inv = await stripe.invoices.create({
        customer: customer.id,
        collection_method: 'send_invoice',
        days_until_due: 7
      });
      for (const it of quote.items || []) {
        await stripe.invoiceItems.create({
          customer: customer.id,
          invoice: inv.id,
          amount: Math.round(Number(it.price || 0) * 100),
          quantity: Number(it.qty || 1),
          currency: 'usd',
          description: it.title || it.sku || 'Item'
        });
      }
      const draftInvoiceId = inv.id;
      if (!draftInvoiceId) {
        throw new Error('Stripe invoice creation did not return an id.');
      }
      const finalized = await stripe.invoices.finalizeInvoice(draftInvoiceId);
      invoiceId = finalized.id;
      hostedInvoiceUrl = finalized.hosted_invoice_url || undefined;
      invoiceNumber = finalized.number || undefined;
      invoiceTotal = typeof finalized.total === 'number' ? finalized.total / 100 : undefined;
      try {
        if (finalized.id) {
          await stripe.invoices.sendInvoice(finalized.id);
        }
      } catch {}
      await sanity
        .patch(quote._id)
        .set({
          stripeInvoiceId: invoiceId,
          stripeHostedInvoiceUrl: hostedInvoiceUrl,
          stripeInvoiceNumber: invoiceNumber,
          stripeInvoiceTotal: invoiceTotal,
          status: 'sent'
        })
        .commit();
    } else {
      const inv = await stripe.invoices.retrieve(invoiceId);
      hostedInvoiceUrl = (inv as any)?.hosted_invoice_url || hostedInvoiceUrl;
      invoiceNumber = (inv as any)?.number || undefined;
      invoiceTotal = typeof (inv as any)?.total === 'number' ? (inv as any).total / 100 : undefined;
      const retrievedInvoiceId = inv.id || invoiceId;
      if ((inv as any)?.status === 'draft' && retrievedInvoiceId) {
        const finalized = await stripe.invoices.finalizeInvoice(retrievedInvoiceId);
        hostedInvoiceUrl = finalized.hosted_invoice_url || hostedInvoiceUrl;
        invoiceNumber = finalized.number || invoiceNumber;
        invoiceTotal = typeof finalized.total === 'number' ? finalized.total / 100 : invoiceTotal;
        try {
          if (finalized.id) {
            await stripe.invoices.sendInvoice(finalized.id);
          }
        } catch {}
      } else {
        try {
          await stripe.invoices.sendInvoice(invoiceId);
        } catch {}
      }
      await sanity
        .patch(quote._id)
        .set({
          stripeHostedInvoiceUrl: hostedInvoiceUrl,
          stripeInvoiceNumber: invoiceNumber,
          stripeInvoiceTotal: invoiceTotal,
          status: 'sent'
        })
        .commit();
    }

    return json(200, {
      ok: true,
      stripeInvoiceId: invoiceId,
      hostedInvoiceUrl,
      stripeInvoiceNumber: invoiceNumber,
      stripeInvoiceTotal: invoiceTotal
    });
  } catch (e: any) {
    return json(e.statusCode || 500, { error: e.message || 'Send failed' });
  }
};

export default { handler };
