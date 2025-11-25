import type { APIRoute } from 'astro';
import { sanityServer } from '@/lib/sanityServer';
import { promotionLandingQuery } from '@/lib/storefrontQueries';

export const GET: APIRoute = async ({ params }) => {
  const slug = (params.slug || '').toString();
  if (!slug) return new Response(JSON.stringify({ error: 'Missing slug' }), { status: 400 });
  try {
    const promotion = await sanityServer.fetch(promotionLandingQuery, { slug });
    if (!promotion) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    return new Response(JSON.stringify(promotion), { status: 200 });
  } catch (error: any) {
    console.error('[api/promotions/[slug]] failed', error?.message || error);
    return new Response(JSON.stringify({ error: 'Failed to load promotion' }), { status: 500 });
  }
};
