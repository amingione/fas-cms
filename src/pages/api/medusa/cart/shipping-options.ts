import type { APIRoute } from 'astro';
import { jsonResponse } from '@/server/http/responses';
import { getMedusaConfig, medusaFetch, readJsonSafe } from '@/lib/medusa';

async function fetchShippingOptions(cartId: string) {
  const primary = await medusaFetch(`/store/shipping-options/${cartId}`, { method: 'GET' });
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

  return jsonResponse(
    { shippingOptions: data?.shipping_options ?? data?.shippingOptions ?? [] },
    { status: 200 },
    { noIndex: true }
  );
};
