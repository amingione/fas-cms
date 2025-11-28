import type { APIRoute } from 'astro';
import { sanityServer } from '@/lib/sanityServer';
import { productReviewsQuery } from '@/lib/storefrontQueries';

const sortMap: Record<string, string> = {
  newest: 'submittedAt desc',
  highest: 'rating desc, submittedAt desc',
  lowest: 'rating asc, submittedAt desc',
  helpful: 'helpful.upvotes desc, submittedAt desc'
};

export const GET: APIRoute = async ({ params, url }) => {
  const productId = params.productId;
  if (!productId) return new Response(JSON.stringify({ error: 'Missing productId' }), { status: 400 });
  const sortKey = (url.searchParams.get('sort') || 'newest').toLowerCase();
  const orderBy = sortMap[sortKey] || sortMap.newest;

  try {
    const query = productReviewsQuery.replace(/order\(featured desc, submittedAt desc\)/g, `order(featured desc, ${orderBy})`);
    const reviews = await sanityServer.fetch(query, { productId });
    return new Response(JSON.stringify(reviews || []), { status: 200 });
  } catch (error: any) {
    console.error('[api/products/[productId]/reviews] failed', error?.message || error);
    return new Response(JSON.stringify({ error: 'Failed to load reviews' }), { status: 500 });
  }
};
