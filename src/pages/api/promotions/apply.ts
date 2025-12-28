import type { APIRoute } from 'astro';
import { sanityServer } from '@/lib/sanityServer';
import { applyPromotion, type CartLine } from '@/server/sanity/promotions';
import { promotionApplySchema } from '@/lib/validators/api-requests';

export const POST: APIRoute = async ({ request }) => {
  try {
    const bodyResult = promotionApplySchema.safeParse(await request.json());
    if (!bodyResult.success) {
      console.error('[validation-failure]', {
        schema: 'promotionApplySchema',
        context: 'api/promotions/apply',
        identifier: 'unknown',
        timestamp: new Date().toISOString(),
        errors: bodyResult.error.format()
      });
      return new Response(
        JSON.stringify({ error: 'Validation failed', details: bodyResult.error.format() }),
        { status: 422 }
      );
    }
    const promotionCode = bodyResult.data.promotionCode || bodyResult.data.code;
    const customerId = bodyResult.data.customerId as string | undefined;
    const cart: CartLine[] = Array.isArray(bodyResult.data.cart) ? bodyResult.data.cart : [];

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
