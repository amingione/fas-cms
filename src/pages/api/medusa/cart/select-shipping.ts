import type { APIRoute } from 'astro';
import { jsonResponse } from '@/server/http/responses';
import { getMedusaConfig, medusaFetch, readJsonSafe } from '@/lib/medusa';

export const POST: APIRoute = async ({ request }) => {
  const config = getMedusaConfig();
  if (!config) {
    return jsonResponse({ error: 'Medusa backend not configured.' }, { status: 503 }, { noIndex: true });
  }

  let body: any = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const cartId = typeof body?.cartId === 'string' ? body.cartId.trim() : '';
  const optionId = typeof body?.optionId === 'string' ? body.optionId.trim() : '';

  if (!cartId || !optionId) {
    return jsonResponse({ error: 'Missing cartId or optionId.' }, { status: 400 }, { noIndex: true });
  }

  const response = await medusaFetch(`/store/carts/${cartId}/shipping-methods`, {
    method: 'POST',
    body: JSON.stringify({ option_id: optionId })
  });
  const data = await readJsonSafe<any>(response);

  if (!response.ok) {
    return jsonResponse(
      { error: data?.message || 'Failed to select shipping option.', details: data },
      { status: response.status },
      { noIndex: true }
    );
  }

  return jsonResponse(
    { cart: data?.cart ?? null },
    { status: 200 },
    { noIndex: true }
  );
};
