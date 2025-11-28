import type { APIRoute } from 'astro';
import { sanityServer } from '@/lib/sanityServer';
import { validatePromotionQuery } from '@/lib/storefrontQueries';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { code } = await request.json();
    if (!code || typeof code !== 'string') {
      return new Response(JSON.stringify({ error: 'code is required' }), { status: 400 });
    }
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
