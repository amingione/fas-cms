import type { APIRoute } from 'astro';
import { sanityServer } from '@/lib/sanityServer';
import { validatePromotionQuery } from '@/lib/storefrontQueries';
import { promotionValidateSchema } from '@/lib/validators/api-requests';

export const POST: APIRoute = async ({ request }) => {
  try {
    const bodyResult = promotionValidateSchema.safeParse(await request.json());
    if (!bodyResult.success) {
      console.error('[validation-failure]', {
        schema: 'promotionValidateSchema',
        context: 'api/promotions/validate',
        identifier: 'unknown',
        timestamp: new Date().toISOString(),
        errors: bodyResult.error.format()
      });
      return new Response(
        JSON.stringify({ error: 'Validation failed', details: bodyResult.error.format() }),
        { status: 422 }
      );
    }
    const { code } = bodyResult.data;
    const promotion = await sanityServer.fetch(validatePromotionQuery, { code });
    if (!promotion) return new Response(JSON.stringify({ valid: false }), { status: 404 });
    return new Response(JSON.stringify({ valid: !!promotion.isValid, promotion }), { status: 200 });
  } catch (error: any) {
    console.error('[api/promotions/validate] failed', error?.message || error);
    return new Response(JSON.stringify({ error: 'Failed to validate promotion' }), { status: 500 });
  }
};

export const GET: APIRoute = async ({ url }) => {
  const code = (url.searchParams.get('code') || '').trim();
  if (!code) return new Response(JSON.stringify({ error: 'code is required' }), { status: 400 });
  return POST({ request: new Request('', { method: 'POST', body: JSON.stringify({ code }) }) } as any);
};
