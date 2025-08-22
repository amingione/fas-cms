import type { Handler } from '@netlify/functions';
import { sanity } from './_sanity';
import { requireUser } from './_auth';

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    requireUser(event);
    const body = JSON.parse(event.body || '{}');
    const { _id, number, customerName, customerEmail, items = [], status = 'draft' } = body;
    const total = items.reduce(
      (s: any, it: any) => s + Number(it.price || 0) * Number(it.qty || 1),
      0
    );
    const doc: any = { _type: 'quote', number, customerName, customerEmail, items, status, total };
    const res = _id ? await sanity.patch(_id).set(doc).commit() : await sanity.create(doc);
    return { statusCode: 200, body: JSON.stringify(res) };
  } catch (e: any) {
    return { statusCode: e.statusCode || 500, body: e.message || 'Error' };
  }
};
