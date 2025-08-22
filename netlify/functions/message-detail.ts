import type { Handler } from '@netlify/functions';
import { requireUser } from './_auth';
import { sanity } from './_sanity';

export const handler: Handler = async (event) => {
  try {
    requireUser(event);
    const id = new URLSearchParams(event.rawQuery || '').get('id');
    if (!id) return { statusCode: 400, body: 'Missing id' };
    const q = `*[_type=="message" && _id==$id][0]{ _id, subject, body, fromEmail, status, createdAt }`;
    return { statusCode: 200, body: JSON.stringify(await sanity.fetch(q, { id })) };
  } catch (e: any) {
    return { statusCode: e.statusCode || 500, body: e.message || 'Error' };
  }
};
