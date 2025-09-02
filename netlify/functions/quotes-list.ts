import type { Handler } from '@netlify/functions';
import { sanity } from './_sanity';
import { requireUser } from './_auth';

export const handler: Handler = async (event) => {
  try {
    requireUser(event);
    const q = `*[_type=="quote"]|order(_createdAt desc)[0...200]{
      _id,
      number,
      customerName,
      customerEmail,
      status,
      total,
      stripeInvoiceId,
      stripeInvoiceNumber,
      stripeHostedInvoiceUrl,
      _createdAt
    }`;
    return { statusCode: 200, body: JSON.stringify(await sanity.fetch(q)) };
  } catch (e: any) {
    return { statusCode: e.statusCode || 500, body: e.message || 'Error' };
  }
};
