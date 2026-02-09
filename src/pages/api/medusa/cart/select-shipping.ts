import type { APIRoute } from 'astro';
import { jsonResponse } from '@/server/http/responses';
import { getMedusaConfig, medusaFetch, readJsonSafe } from '@/lib/medusa';
import { normalizeCartTotals } from '@/lib/money';

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
  const shippoRate = body?.shippoRate && typeof body.shippoRate === 'object' ? body.shippoRate : null;

  if (!cartId || !optionId) {
    return jsonResponse({ error: 'Missing cartId or optionId.' }, { status: 400 }, { noIndex: true });
  }

  const fulfillmentData =
    shippoRate && typeof shippoRate.rate_id === 'string'
      ? {
          shippo_rate_id: shippoRate.rate_id,
          shippo_rate_amount: shippoRate.amount,
          shippo_rate_currency: shippoRate.currency,
          shippo_servicelevel: shippoRate.servicelevel
        }
      : undefined;

  const response = await medusaFetch(`/store/carts/${cartId}/shipping-methods`, {
    method: 'POST',
    body: JSON.stringify({
      option_id: optionId,
      ...(fulfillmentData ? { data: fulfillmentData } : {})
    })
  });
  const data = await readJsonSafe<any>(response);

  if (!response.ok) {
    return jsonResponse(
      { error: data?.message || 'Failed to select shipping option.', details: data },
      { status: response.status },
      { noIndex: true }
    );
  }

  if (data?.cart) {
    normalizeCartTotals(data.cart);
  }

  return jsonResponse(
    { cart: data?.cart ?? null },
    { status: 200 },
    { noIndex: true }
  );
};
