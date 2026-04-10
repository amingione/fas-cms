import type { APIRoute } from 'astro';
import { jsonResponse } from '@/server/http/responses';
import { getMedusaConfig, medusaFetch, readJsonSafe } from '@/lib/medusa';
import { buildStorefrontCartFromMedusaCart } from '@/lib/cart/transform';

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

const GUEST_CART_ID_MIN_LENGTH = 16;

function isLikelyBearerCartId(value: string): boolean {
  return /^[A-Za-z0-9_-]+$/.test(value) && value.length >= GUEST_CART_ID_MIN_LENGTH;
}

function itemRequiresShipping(item: any): boolean {
  const normalizedTitle = String(item?.title || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  if (normalizedTitle.includes('performancepackage') || normalizedTitle.includes('installonly')) {
    return false;
  }
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
      shippingClass.includes('service') ||
      shippingClass.includes('performancepackage')
    ) {
      return false;
    }
  }

  const shippingClass = normalizeShippingClass(item?.shipping_class);
  const productType = normalizeShippingClass(
    item?.variant?.product?.type?.value ?? item?.variant?.product?.type?.name
  );
  if (
    shippingClass.includes('installonly') ||
    shippingClass.includes('service') ||
    shippingClass.includes('performancepackage') ||
    productType.includes('service') ||
    productType.includes('performancepackage')
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
  const shippingData =
    body?.shippingData && typeof body.shippingData === 'object' && !Array.isArray(body.shippingData)
      ? body.shippingData
      : undefined;

  if (!cartId || !optionId) {
    return jsonResponse({ error: 'Missing cartId or optionId.' }, { status: 400 }, { noIndex: true });
  }
  // Guest-checkout decision: cart IDs are capability tokens and auth is optional by design.
  // Guardrail: reject malformed/low-entropy IDs and avoid logging raw cart IDs.
  if (!isLikelyBearerCartId(cartId)) {
    return jsonResponse({ error: 'Invalid cartId.' }, { status: 400 }, { noIndex: true });
  }

  // Service/package carts can be intentionally non-shippable. In that case this
  // endpoint should be a safe no-op so checkout can continue to payment.
  const fieldsParam = 'fields=+promotions,+promotions.application_method';
  const cartResponse = await medusaFetch(`/store/carts/${cartId}?${fieldsParam}`, { method: 'GET' });
  const cartData = await readJsonSafe<any>(cartResponse);
  if (cartResponse.ok && cartData?.cart) {
    const items = Array.isArray(cartData.cart.items) ? cartData.cart.items : [];
    const requiresShipping = items.some((item: any) => itemRequiresShipping(item));
    if (!requiresShipping) {
      return jsonResponse(
        { cart: buildStorefrontCartFromMedusaCart(cartData.cart) },
        { status: 200 },
        { noIndex: true }
      );
    }
  }

  const response = await medusaFetch(`/store/carts/${cartId}/shipping-methods`, {
    method: 'POST',
    body: JSON.stringify({
      option_id: optionId,
      ...(shippingData ? { data: shippingData } : {})
    })
  });
  const data = await readJsonSafe<any>(response);

  if (!response.ok) {
    const message = String(data?.message || data?.error || '').toLowerCase();
    if (message.includes('does not require shipping') || message.includes('shipping is not required')) {
      const fallbackCart = cartData?.cart ?? null;
      return jsonResponse(
        { cart: fallbackCart ? buildStorefrontCartFromMedusaCart(fallbackCart) : null },
        { status: 200 },
        { noIndex: true }
      );
    }
    return jsonResponse(
      { error: data?.message || 'Failed to select shipping option.', details: data },
      { status: response.status },
      { noIndex: true }
    );
  }

  return jsonResponse(
    { cart: data?.cart ? buildStorefrontCartFromMedusaCart(data.cart) : null },
    { status: 200 },
    { noIndex: true }
  );
};
