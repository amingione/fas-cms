import type { APIRoute } from 'astro';
import { medusaFetch, readJsonSafe } from '@/lib/medusa';
import { normalizeCartTotals } from '@/lib/money';

const GUEST_CART_ID_MIN_LENGTH = 16;

function isLikelyBearerCartId(value: string): boolean {
  return /^[A-Za-z0-9_-]+$/.test(value) && value.length >= GUEST_CART_ID_MIN_LENGTH;
}

function normalizeCode(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function collectCartPromotionCodes(cart: any): Set<string> {
  const codes = new Set<string>();
  const collect = (raw: unknown) => {
    if (typeof raw !== 'string') return;
    const normalized = raw.trim();
    if (!normalized) return;
    codes.add(normalized.toLowerCase());
  };

  const promotions = Array.isArray(cart?.promotions) ? cart.promotions : [];
  const discounts = Array.isArray(cart?.discounts) ? cart.discounts : [];

  for (const promotion of promotions) {
    collect((promotion as any)?.code);
    collect((promotion as any)?.promotion_code);
    collect((promotion as any)?.campaign?.code);
  }
  for (const discount of discounts) {
    collect((discount as any)?.code);
    collect((discount as any)?.discount_rule?.code);
  }

  return codes;
}

function buildRemovalIdentifiers(cart: any, code: string): string[] {
  const normalizedCode = code.trim().toLowerCase();
  const identifiers = new Set<string>();
  const promotions = Array.isArray(cart?.promotions) ? cart.promotions : [];

  const maybeAddIdentifier = (raw: unknown) => {
    if (typeof raw !== 'string') return;
    const normalized = raw.trim();
    if (!normalized) return;
    identifiers.add(normalized);
  };

  for (const promotion of promotions) {
    const promotionCode =
      normalizeCode((promotion as any)?.code) ||
      normalizeCode((promotion as any)?.promotion_code) ||
      normalizeCode((promotion as any)?.campaign?.code);
    if (promotionCode.toLowerCase() !== normalizedCode) continue;

    // Medusa deployments vary: some expect promotion ID, others accept code.
    maybeAddIdentifier((promotion as any)?.id);
    maybeAddIdentifier((promotion as any)?.promotion_id);
    maybeAddIdentifier((promotion as any)?.code);
    maybeAddIdentifier((promotion as any)?.promotion_code);
    maybeAddIdentifier((promotion as any)?.campaign?.id);
  }

  // Always attempt by code as a fallback.
  maybeAddIdentifier(code);
  return Array.from(identifiers);
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const cartId = typeof body?.cartId === 'string' ? body.cartId.trim() : '';
    const code = normalizeCode(body?.code ?? body?.promotionCode);
    const action = body?.action === 'remove' ? 'remove' : 'apply';

    if (!cartId || !code) {
      return new Response(JSON.stringify({ error: 'cartId and code are required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    if (!isLikelyBearerCartId(cartId)) {
      return new Response(JSON.stringify({ error: 'Invalid cart ID.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let mutationResponse: Response;
    if (action === 'remove') {
      const beforeResponse = await medusaFetch(
        `/store/carts/${encodeURIComponent(cartId)}?fields=+promotions,+promotions.application_method`,
        { method: 'GET' }
      );
      const beforePayload = await readJsonSafe<any>(beforeResponse);
      const removalIdentifiers = buildRemovalIdentifiers(beforePayload?.cart, code);

      mutationResponse = new Response(null, { status: 404 });
      for (const identifier of removalIdentifiers) {
        mutationResponse = await medusaFetch(
          `/store/carts/${encodeURIComponent(cartId)}/promotions/${encodeURIComponent(identifier)}`,
          { method: 'DELETE' }
        );
        if (mutationResponse.ok) {
          break;
        }
      }

      if (!mutationResponse.ok) {
        mutationResponse = await medusaFetch(
          `/store/carts/${encodeURIComponent(cartId)}/promotions`,
          {
            method: 'DELETE',
            body: JSON.stringify({ promo_codes: [code] })
          }
        );
      }
    } else {
      mutationResponse = await medusaFetch(`/store/carts/${encodeURIComponent(cartId)}/promotions`, {
        method: 'POST',
        body: JSON.stringify({ promo_codes: [code] })
      });
    }

    const mutationPayload = await readJsonSafe<any>(mutationResponse);
    if (!mutationResponse.ok) {
      console.error('[discount-code] Medusa promotion mutation failed:', {
        status: mutationResponse.status,
        payload: mutationPayload,
        code,
        action
      });
      return new Response(
        JSON.stringify({
          error:
            mutationPayload?.message ||
            mutationPayload?.error ||
            (action === 'remove'
              ? 'Unable to remove discount code.'
              : 'Invalid or expired discount code.')
        }),
        {
          status: 422,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Include promotions, item totals, and item metadata for consistent display.
    const fieldsParam = 'fields=+promotions,+promotions.application_method,+items.total,+items.metadata,+items.adjustments';
    const cartResponse = await medusaFetch(`/store/carts/${encodeURIComponent(cartId)}?${fieldsParam}`, { method: 'GET' });
    const cartPayload = await readJsonSafe<any>(cartResponse);
    if (!cartResponse.ok || !cartPayload?.cart) {
      return new Response(JSON.stringify({ error: 'Failed to refresh cart after discount update.' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    normalizeCartTotals(cartPayload.cart);

    // Debug logging to check discount data
    console.log('[discount-code] Cart after promotion mutation:', {
      cartId,
      code,
      action,
      promotions: cartPayload.cart?.promotions,
      discounts: cartPayload.cart?.discounts,
      discount_total: cartPayload.cart?.discount_total,
      subtotal: cartPayload.cart?.subtotal,
      total: cartPayload.cart?.total
    });

    const normalizedRequestedCode = code.trim().toLowerCase();
    const cartCodes = collectCartPromotionCodes(cartPayload.cart);
    if (action === 'remove' && cartCodes.has(normalizedRequestedCode)) {
      return new Response(
        JSON.stringify({
          error: `Unable to remove discount code "${code}". Please clear cart and try again.`
        }),
        {
          status: 422,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        action,
        cart: cartPayload.cart
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to update discount code.'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
