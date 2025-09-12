import type { Handler } from '@netlify/functions';
import { sanity } from './_sanity';
import { requireUser } from './_auth';

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    await requireUser(event);
    const { _id, status } = JSON.parse(event.body || '{}');
    if (!_id || !status) return { statusCode: 400, body: 'Missing fields' };
    const doc = await sanity.patch(_id).set({ status }).commit();
    return { statusCode: 200, body: JSON.stringify(doc) };
  } catch (e: any) {
    return { statusCode: e.statusCode || 500, body: e.message || 'Error' };
  }
};
