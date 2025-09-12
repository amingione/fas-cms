import type { Handler } from '@netlify/functions';
import { requireUser } from './_auth';
import { stripe } from './_stripe';

export const handler: Handler = async (event) => {
  try {
    await requireUser(event);
    const res = await stripe.invoices.list({ limit: 50 });
    const data = res.data.map((inv) => ({
      id: inv.id,
      number: inv.number,
      status: inv.status,
      total: (inv.total || 0) / 100,
      hostedInvoiceUrl: inv.hosted_invoice_url || '',
      customerEmail: (inv.customer_email as string) || '',
      created: new Date((inv.created || 0) * 1000).toISOString()
    }));
    return { statusCode: 200, body: JSON.stringify(data) };
  } catch (e: any) {
    return { statusCode: e.statusCode || 500, body: e.message || 'Error' };
  }
};
