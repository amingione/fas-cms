import type { Handler } from '@netlify/functions';
import { sanity } from './_sanity';
import { requireUser } from './_auth';

const ALLOWED_STATUSES = [
  'pending',
  'unfulfilled',
  'processing',
  'fulfilled',
  'cancelled',
  'refunded',
] as const;
type OrderStatus = (typeof ALLOWED_STATUSES)[number];

const isInvalidTransition = (current: OrderStatus | undefined, next: OrderStatus) => {
  if (!current) return false;
  if (current === 'cancelled' && next !== 'cancelled') return true;
  if (current === 'refunded' && next !== 'refunded') return true;
  if (current === 'fulfilled' && next === 'pending') return true;
  if (current === 'pending' && next === 'fulfilled') return true;
  return false;
};

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    await requireUser(event);
    const { _id, status } = JSON.parse(event.body || '{}');
    if (!_id || !status) return { statusCode: 400, body: 'Missing fields' };
    if (!ALLOWED_STATUSES.includes(status)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid order status' }) };
    }
    const existing = await sanity.fetch<{ status?: OrderStatus } | null>(
      '*[_id == $id][0]{status}',
      { id: _id },
    );
    if (isInvalidTransition(existing?.status, status)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid order status transition' }) };
    }
    const doc = await sanity.patch(_id).set({ status }).commit();
    return { statusCode: 200, body: JSON.stringify(doc) };
  } catch (e: any) {
    return { statusCode: e.statusCode || 500, body: e.message || 'Error' };
  }
};
