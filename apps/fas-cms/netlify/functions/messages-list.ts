import type { Handler } from '@netlify/functions';
import { requireUser } from './_auth';
import { sanity } from './_sanity';

export const handler: Handler = async (event) => {
  try {
    await requireUser(event);
    const q = `*[_type=="message"]|order(createdAt desc)[0...200]{ _id, subject, fromEmail, status, createdAt }`;
    return { statusCode: 200, body: JSON.stringify(await sanity.fetch(q)) };
  } catch (e: any) {
    return { statusCode: e.statusCode || 500, body: e.message || 'Error' };
  }
};
