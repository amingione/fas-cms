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
      mutationResponse = await medusaFetch(
        `/store/carts/${encodeURIComponent(cartId)}/promotions/${encodeURIComponent(code)}`,
        { method: 'DELETE' }
      );
      if (!mutationResponse.ok) {
        mutationResponse = await medusaFetch(`/store/carts/${encodeURIComponent(cartId)}/promotions`, {
          method: 'DELETE',
          body: JSON.stringify({ promo_codes: [code] })
        });
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

    // Include promotions fields to get full discount details
    const fieldsParam = 'fields=+promotions,+promotions.application_method';
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
