import type { APIRoute } from 'astro';
import { sanityServer } from '@/lib/sanityServer';
import { collectionsForNavQuery } from '@/lib/storefrontQueries';

export const GET: APIRoute = async () => {
  try {
    const collections = await sanityServer.fetch(collectionsForNavQuery);
    return new Response(JSON.stringify(collections || []), { status: 200 });
  } catch (error: any) {
    console.error('[api/collections/menu] failed', error?.message || error);
    return new Response(JSON.stringify({ error: 'Failed to load collections' }), { status: 500 });
  }
};
