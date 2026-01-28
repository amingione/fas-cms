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
    return carrier === 'ups' || carrier === 'usps';
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

  return jsonResponse(
    { shippingOptions: withRates },
    { status: 200 },
    { noIndex: true }
  );
};
