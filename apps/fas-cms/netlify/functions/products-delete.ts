import type { Handler } from '@netlify/functions';
import { sanity } from './_sanity';
import { requireUser } from './_auth';

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    await requireUser(event);
    const body = JSON.parse(event.body || '{}');
    const id = (body._id || body.id || '').trim();
    if (!id) return { statusCode: 400, body: 'Missing id' };
    await sanity.delete(id);
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e: any) {
    return { statusCode: e.statusCode || 500, body: e.message || 'Delete failed' };
  }
};

export default { handler };
