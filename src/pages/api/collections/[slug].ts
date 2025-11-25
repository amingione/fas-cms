import type { APIRoute } from 'astro';
import { sanityServer } from '@/lib/sanityServer';
import { collectionWithProductsQuery } from '@/lib/storefrontQueries';
import { getCollectionProducts } from '@/server/sanity/collections';

export const GET: APIRoute = async ({ params }) => {
  const slug = params.slug;
  if (!slug) return new Response(JSON.stringify({ error: 'Missing slug' }), { status: 400 });

  try {
    const collection = await sanityServer.fetch(collectionWithProductsQuery, { slug });
    if (!collection) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });

    if (collection.collectionType === 'manual') {
      return new Response(JSON.stringify(collection), { status: 200 });
    }

    const products = await getCollectionProducts(sanityServer, collection._id);
    return new Response(JSON.stringify({ ...collection, products }), { status: 200 });
  } catch (error: any) {
    console.error('[api/collections/[slug]] failed', error?.message || error);
    return new Response(JSON.stringify({ error: 'Failed to load collection' }), { status: 500 });
  }
};
