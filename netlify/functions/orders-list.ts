import type { Handler } from '@netlify/functions';
import { sanity } from './_sanity';
import { requireUser } from './_auth';

export const handler: Handler = async (event) => {
  try {
    requireUser(event);
    // Prefer Sanity cache
    const q = `*[_type=="order"]|order(orderDate desc)[0...200]{
      _id, orderNumber, status, total, customerName, orderDate, 
      items[]{ title, qty, price }
    }`;
    const cached = await sanity.fetch(q);
    if (Array.isArray(cached) && cached.length) {
      return { statusCode: 200, body: JSON.stringify({ source: 'sanity', data: cached }) };
    }

    // Fallback to Stripe PaymentIntents (simple example)
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) return { statusCode: 200, body: JSON.stringify({ source: 'empty', data: [] }) };
    const stripe = (await import('stripe')).default;
    const s = new stripe(stripeKey, { apiVersion: '2025-07-30.basil' });
    const pis = await s.paymentIntents.list({ limit: 50 });
    const data = pis.data.map((pi) => ({
      _id: pi.id,
      orderNumber: pi.id,
      status: pi.status,
      total: pi.amount / 100,
      customerName: pi.receipt_email || '',
      orderDate: new Date(pi.created * 1000).toISOString(),
      items: []
    }));
    return { statusCode: 200, body: JSON.stringify({ source: 'stripe', data }) };
  } catch (e: any) {
    return { statusCode: e.statusCode || 500, body: e.message || 'Error' };
  }
};
