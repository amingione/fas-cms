import type { Handler } from '@netlify/functions';
import { sanity } from './_sanity';
import { requireUser } from './_auth';

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    requireUser(event);
    const body = JSON.parse(event.body || '{}');
    const { _id, name, email, phone, notes, address } = body;
    if (!email) return { statusCode: 400, body: 'Missing email' };
    const doc: any = { _type: 'customer', name, email, phone, notes, address };
    const res = _id ? await sanity.patch(_id).set(doc).commit() : await sanity.create(doc);
    return { statusCode: 200, body: JSON.stringify(res) };
  } catch (e: any) {
    return { statusCode: e.statusCode || 500, body: e.message || 'Error' };
  }
};

export default { handler };

