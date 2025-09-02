import type { Handler } from '@netlify/functions';
import { requireUser } from './_auth';
import { stripe } from './_stripe';

export const handler: Handler = async (event) => {
  try {
    // Auth
    requireUser(event);

    const id = event.queryStringParameters?.id;
    if (!id) return { statusCode: 400, body: 'Missing id' };

    // Fetch core customer
    const customer = await stripe.customers.retrieve(id);

    // Invoices (latest first)
    const invoicesResp = await stripe.invoices.list({ customer: id, limit: 20 });
    const invoices = invoicesResp.data.map((inv) => ({
      id: inv.id,
      number: inv.number,
      status: inv.status,
      total: (inv.total || 0) / 100,
      hostedInvoiceUrl: inv.hosted_invoice_url || '',
      created: new Date((inv.created || 0) * 1000).toISOString()
    }));

    // Payment methods (cards)
    const pms = await stripe.paymentMethods.list({ customer: id, type: 'card' });
    const paymentMethods = pms.data.map((pm) => ({
      id: pm.id,
      brand: pm.card?.brand || '',
      last4: pm.card?.last4 || '',
      exp_month: pm.card?.exp_month || undefined,
      exp_year: pm.card?.exp_year || undefined
    }));

    const out = {
      customer: {
        id: (customer as any).id,
        name: (customer as any).name || '',
        email: (customer as any).email || '',
        phone: (customer as any).phone || '',
        created: new Date((((customer as any).created || 0) as number) * 1000).toISOString(),
        livemode: !!(customer as any).livemode
      },
      invoices,
      paymentMethods
    };

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' },
      body: JSON.stringify(out)
    };
  } catch (e: any) {
    return { statusCode: e.statusCode || 500, body: e.message || 'Error' };
  }
};

export default { handler };

