import type { APIRoute } from 'astro';
import {
  buildCorsHeaders,
  computeShippingQuote,
  type CartItemInput,
  type Destination
} from '@/server/shipping/quote';

const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers }
  });

export const OPTIONS: APIRoute = ({ request }) =>
  new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-methods': 'POST, OPTIONS',
      ...buildCorsHeaders(request.headers.get('origin'))
    }
  });

export const POST: APIRoute = async ({ request }) => {
  try {
    const headers = buildCorsHeaders(request.headers.get('origin'));
    const body = await request.json();
    const cart = Array.isArray(body?.cart) ? (body.cart as CartItemInput[]) : [];
    const destination = body?.destination as Destination | undefined;

    if (!destination) {
      return json({ error: 'Missing destination' }, 400, headers);
    }

    const result = await computeShippingQuote(cart, destination);
    if (!result.success) {
      return json(result, 400, headers);
    }
    return json(result, 200, headers);
  } catch (err: any) {
    console.error('[api/shipping/quote] error', err);
    return json({ error: err?.message || 'Failed to compute shipping quote' }, 500);
  }
};
