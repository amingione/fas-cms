import type { APIRoute } from 'astro';
import { jsonResponse } from '@/server/http/responses';
import { getMedusaConfig, medusaFetch, readJsonSafe } from '@/lib/medusa';
import { normalizeCartTotals } from '@/lib/money';

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

  // Service/package carts can be intentionally non-shippable. In that case this
  // endpoint should be a safe no-op so checkout can continue to payment.
  const cartResponse = await medusaFetch(`/store/carts/${cartId}`, { method: 'GET' });
  const cartData = await readJsonSafe<any>(cartResponse);
  if (cartResponse.ok && cartData?.cart) {
    const items = Array.isArray(cartData.cart.items) ? cartData.cart.items : [];
    const requiresShipping = items.some((item: any) => itemRequiresShipping(item));
    if (!requiresShipping) {
      normalizeCartTotals(cartData.cart);
      return jsonResponse({ cart: cartData.cart }, { status: 200 }, { noIndex: true });
    }
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
    const message = String(data?.message || data?.error || '').toLowerCase();
    if (message.includes('does not require shipping') || message.includes('shipping is not required')) {
      const fallbackCart = cartData?.cart ?? null;
      if (fallbackCart) normalizeCartTotals(fallbackCart);
      return jsonResponse({ cart: fallbackCart }, { status: 200 }, { noIndex: true });
    }
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
