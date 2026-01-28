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

  const regionId = typeof body?.regionId === 'string' && body.regionId.trim()
    ? body.regionId.trim()
    : config.regionId;

  const payload: Record<string, any> = {};
  if (regionId) payload.region_id = regionId;

  const response = await medusaFetch('/store/carts', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  const data = await readJsonSafe<any>(response);

  if (!response.ok) {
    return jsonResponse(
      { error: data?.message || 'Failed to create Medusa cart.', details: data },
      { status: response.status },
      { noIndex: true }
    );
  }

  return jsonResponse(
    { cartId: data?.cart?.id ?? null, cart: data?.cart ?? null },
    { status: 200 },
    { noIndex: true }
  );
};
