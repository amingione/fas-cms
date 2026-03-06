import type { APIRoute } from 'astro';
import { medusaFetch } from '@/lib/medusa';
import { z } from 'zod';

const applySchema = z.object({
  cartId: z.string().min(1),
  promotionCode: z.string().min(1).optional(),
  code: z.string().min(1).optional()
}).passthrough();

export const POST: APIRoute = async ({ request }) => {
  try {
    const bodyResult = applySchema.safeParse(await request.json());
    if (!bodyResult.success) {
      console.error('[validation-failure]', {
        schema: 'applySchema',
        context: 'api/promotions/apply',
        timestamp: new Date().toISOString(),
        errors: bodyResult.error.format()
      });
      return new Response(
        JSON.stringify({ error: 'Validation failed', details: bodyResult.error.format() }),
        { status: 422 }
      );
    }

    const { cartId } = bodyResult.data;
    const promotionCode = bodyResult.data.promotionCode || bodyResult.data.code;

    if (!promotionCode) {
      return new Response(JSON.stringify({ error: 'promotionCode is required' }), { status: 400 });
    }

    const medusaRes = await medusaFetch(`/store/carts/${cartId}/promotions`, {
      method: 'POST',
      body: JSON.stringify({ promo_codes: [promotionCode] })
    });

    const data = await medusaRes.json();

    if (!medusaRes.ok) {
      const message = data?.message || data?.error || 'Invalid or expired promotion code';
      return new Response(JSON.stringify({ error: message }), { status: 422 });
    }

    return new Response(JSON.stringify(data), { status: 200 });
  } catch (error: any) {
    console.error('[api/promotions/apply] failed', error?.message || error);
    return new Response(JSON.stringify({ error: error?.message || 'Failed to apply promotion' }), { status: 500 });
  }
};
