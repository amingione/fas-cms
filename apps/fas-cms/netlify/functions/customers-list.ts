import type { Handler } from '@netlify/functions';
import { requireUser } from './_auth';
import { stripe } from './_stripe';

export const handler: Handler = async (event) => {
  try {
    // AuthZ: require owner or employee session
    await requireUser(event);

    const limit = Number(event.queryStringParameters?.limit || 50);
    const starting_after = event.queryStringParameters?.starting_after || undefined;

    const res = await stripe.customers.list({ limit: Math.min(Math.max(limit, 1), 100), starting_after });
    const data = res.data.map((c) => ({
      id: c.id,
      name: (c.name as string) || '',
      email: (c.email as string) || '',
      phone: (c.phone as string) || '',
      created: new Date((c.created || 0) * 1000).toISOString(),
      livemode: !!c.livemode
    }));

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' },
      body: JSON.stringify({ data, has_more: res.has_more, lastId: res.data.at(-1)?.id || null })
    };
  } catch (e: any) {
    return { statusCode: e.statusCode || 500, body: e.message || 'Error' };
  }
};

export default { handler };
