import type { Handler } from '@netlify/functions';
import { sanity } from './_sanity';
import { requireUser } from './_auth';

export const handler: Handler = async (event) => {
  try {
    await requireUser(event);
    const email = (event.queryStringParameters?.email || '').trim().toLowerCase();
    if (!email) return { statusCode: 400, body: 'Missing email' };
    const q = `*[_type=="customer" && lower(email)==$email][0]{
      _id, name, email, phone, notes, address
    }`;
    const doc = await sanity.fetch(q, { email });
    return { statusCode: 200, body: JSON.stringify(doc || null) };
  } catch (e: any) {
    return { statusCode: e.statusCode || 500, body: e.message || 'Error' };
  }
};

export default { handler };
