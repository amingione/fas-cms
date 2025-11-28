import type { APIRoute } from 'astro';
import { sanityServer } from '@/lib/sanityServer';
import { featuredCollectionsQuery } from '@/lib/storefrontQueries';

export const GET: APIRoute = async () => {
  try {
    const collections = await sanityServer.fetch(featuredCollectionsQuery);
    return new Response(JSON.stringify(collections || []), { status: 200 });
  } catch (error: any) {
    console.error('[api/collections/featured] failed', error?.message || error);
    return new Response(JSON.stringify({ error: 'Failed to load featured collections' }), { status: 500 });
  }
};
