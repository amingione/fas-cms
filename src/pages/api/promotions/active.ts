import type { APIRoute } from 'astro';
import { sanityServer } from '@/lib/sanityServer';
import { activePromotionsQuery } from '@/lib/storefrontQueries';

export const GET: APIRoute = async () => {
  try {
    const promotions = await sanityServer.fetch(activePromotionsQuery);
    return new Response(JSON.stringify(promotions || []), { status: 200 });
  } catch (error: any) {
    console.error('[api/promotions/active] failed', error?.message || error);
    return new Response(JSON.stringify({ error: 'Failed to load promotions' }), { status: 500 });
  }
};
