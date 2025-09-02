import type { Handler } from '@netlify/functions';
import { requireUser } from './_auth';
import { stripe } from './_stripe';

const json = (statusCode: number, body: any) => ({
  statusCode,
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body)
});

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method Not Allowed' });
    requireUser(event);
    const body = JSON.parse(event.body || '{}');
    const customerId: string | undefined = body.customerId;
    const livemode: boolean | undefined = body.livemode;
    if (!customerId) return json(400, { error: 'Missing customerId' });

    const inv = await stripe.invoices.create({ customer: customerId, collection_method: 'send_invoice', days_until_due: 7 });
    const dashboardUrl = `https://dashboard.stripe.com/${livemode ? '' : 'test/'}invoices/${inv.id}`;
    return json(200, { invoiceId: inv.id, dashboardUrl });
  } catch (e: any) {
    return json(e.statusCode || 500, { error: e.message || 'Create failed' });
  }
};

export default { handler };

