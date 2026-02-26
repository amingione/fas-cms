import type { APIRoute } from 'astro';
import { jsonResponse } from '@/server/http/responses';
import { getMedusaConfig, medusaFetch, readJsonSafe } from '@/lib/medusa';

async function fetchShippingOptions(cartId: string) {
  const primary = await medusaFetch(`/store/shipping-options?cart_id=${encodeURIComponent(cartId)}`, {
    method: 'GET'
  });
  if (primary.ok) {
    return primary;
  }

  if (primary.status === 404) {
    return medusaFetch(`/store/carts/${cartId}/shipping-options`, { method: 'GET' });
  }

  return primary;
}

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
  if (!cartId) {
    return jsonResponse({ error: 'Missing cartId.' }, { status: 400 }, { noIndex: true });
  }

  const response = await fetchShippingOptions(cartId);
  const data = await readJsonSafe<any>(response);

  if (!response.ok) {
    return jsonResponse(
      { error: data?.message || 'Failed to load shipping options.', details: data },
      { status: response.status },
      { noIndex: true }
    );
  }

  const options = Array.isArray(data?.shipping_options)
    ? data.shipping_options
    : Array.isArray(data?.shippingOptions)
      ? data.shippingOptions
      : [];

  const allowed = options.filter((option: any) => {
    const carrier = String(option?.data?.carrier || '').toLowerCase();
    return carrier === 'ups';
  });

  const withRates = [];
  for (const option of allowed) {
    const calcResponse = await medusaFetch(`/store/shipping-options/${option.id}/calculate`, {
      method: 'POST',
      body: JSON.stringify({
        cart_id: cartId,
        data: option?.data ?? {}
      })
    });
    const calcData = await readJsonSafe<any>(calcResponse);
    if (!calcResponse.ok) {
      return jsonResponse(
        { error: calcData?.message || 'Failed to calculate shipping rate.', details: calcData },
        { status: calcResponse.status },
        { noIndex: true }
      );
    }
    withRates.push(calcData?.shipping_option ?? option);
  }

  let shippoRates: any[] = [];
  let bestShippoRate: any | null = null;
  try {
    const shippoResponse = await medusaFetch(
      `/store/shippo-rates?cart_id=${encodeURIComponent(cartId)}&carrier=ups`,
      { method: 'GET' }
    );
    const shippoData = await readJsonSafe<any>(shippoResponse);
    if (shippoResponse.ok) {
      shippoRates = Array.isArray(shippoData?.rates) ? shippoData.rates : [];
      bestShippoRate = shippoData?.best_rate ?? null;
    }
  } catch {
    // Optional enhancement; ignore failures here.
  }

  return jsonResponse(
    { shippingOptions: withRates, shippoRates, bestShippoRate },
    { status: 200 },
    { noIndex: true }
  );
};
