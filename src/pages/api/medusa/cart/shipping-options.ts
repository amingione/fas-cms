import type { APIRoute } from 'astro';
import { jsonResponse } from '@/server/http/responses';
import { getMedusaConfig, medusaFetch, readJsonSafe } from '@/lib/medusa';

function parseBooleanLike(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false;
  return undefined;
}

function normalizeShippingClass(value: unknown): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function itemRequiresShipping(item: any): boolean {
  const directInstall = parseBooleanLike(item?.install_only);
  if (directInstall === true) return false;
  const directRequiresShipping =
    parseBooleanLike(item?.requires_shipping) ??
    parseBooleanLike(item?.is_shipping_required);
  if (directRequiresShipping !== undefined) return directRequiresShipping;

  const metadataSources = [
    item?.metadata,
    item?.variant?.metadata,
    item?.variant?.product?.metadata
  ].filter((metadata) => metadata && typeof metadata === 'object');

  for (const metadata of metadataSources) {
    const installOnly =
      parseBooleanLike((metadata as any)?.install_only) ??
      parseBooleanLike((metadata as any)?.installOnly);
    if (installOnly === true) return false;
    const requiresShipping =
      parseBooleanLike((metadata as any)?.requires_shipping) ??
      parseBooleanLike((metadata as any)?.requiresShipping);
    if (requiresShipping !== undefined) return requiresShipping;
    const shippingClass = normalizeShippingClass(
      (metadata as any)?.shipping_class ?? (metadata as any)?.shippingClass
    );
    if (
      shippingClass.includes('installonly') ||
      shippingClass.includes('service')
    ) {
      return false;
    }
  }

  const shippingClass = normalizeShippingClass(item?.shipping_class);
  if (
    shippingClass.includes('installonly') ||
    shippingClass.includes('service')
  ) {
    return false;
  }
  return true;
}

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

  const cartResponse = await medusaFetch(`/store/carts/${cartId}`, { method: 'GET' });
  const cartData = await readJsonSafe<any>(cartResponse);
  if (cartResponse.ok && cartData?.cart) {
    const items = Array.isArray(cartData.cart.items) ? cartData.cart.items : [];
    const requiresShipping = items.some((item: any) => itemRequiresShipping(item));
    if (!requiresShipping) {
      return jsonResponse(
        { shippingOptions: [], shippoRates: [], bestShippoRate: null, requiresShipping: false },
        { status: 200 },
        { noIndex: true }
      );
    }
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

  const upsOnly = options.filter((option: any) => {
    const carrier = String(option?.data?.carrier || '').toLowerCase();
    return carrier === 'ups';
  });
  const candidates = upsOnly.length ? upsOnly : options;

  const withRates = [];
  for (const option of candidates) {
    const calcResponse = await medusaFetch(`/store/shipping-options/${option.id}/calculate`, {
      method: 'POST',
      body: JSON.stringify({
        cart_id: cartId,
        data: option?.data ?? {}
      })
    });
    const calcData = await readJsonSafe<any>(calcResponse);
    if (!calcResponse.ok) {
      // Fallback to raw option so storefront can still select a valid method.
      // Some providers fail pre-calc but still support selection and downstream totals.
      withRates.push(option);
      continue;
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
