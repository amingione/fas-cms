import type { APIRoute } from 'astro';
import { sanityServer } from '@/lib/sanityServer';
import { applyPromotion, type CartLine } from '@/server/sanity/promotions';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const promotionCode = body.promotionCode || body.code;
    const customerId = body.customerId as string | undefined;
    const cart: CartLine[] = Array.isArray(body.cart) ? body.cart : [];

    if (!promotionCode || !cart.length) {
      return new Response(JSON.stringify({ error: 'promotionCode and cart are required' }), { status: 400 });
    }

    const applied = await applyPromotion(sanityServer, cart, promotionCode, customerId);
    return new Response(JSON.stringify(applied), { status: 200 });
  } catch (error: any) {
    console.error('[api/promotions/apply] failed', error?.message || error);
    return new Response(JSON.stringify({ error: error?.message || 'Failed to apply promotion' }), { status: 500 });
  }
};
