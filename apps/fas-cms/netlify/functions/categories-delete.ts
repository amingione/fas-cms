import type { Handler } from '@netlify/functions';
import { sanity } from './_sanity';
import { requireUser } from './_auth';

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    await requireUser(event);
    const { _id } = JSON.parse(event.body || '{}');
    if (!_id) return { statusCode: 400, body: 'Missing _id' };
    await sanity.delete(_id);
    return { statusCode: 200, body: '{"ok":true}' };
  } catch (e: any) {
    return { statusCode: e.statusCode || 500, body: e.message || 'Error' };
  }
};
