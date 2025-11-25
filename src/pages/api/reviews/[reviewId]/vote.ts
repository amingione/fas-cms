import type { APIRoute } from 'astro';
import { sanityServer } from '@/lib/sanityServer';

export const POST: APIRoute = async ({ params, request }) => {
  try {
    const reviewId = params.reviewId;
    if (!reviewId) return new Response(JSON.stringify({ error: 'Missing reviewId' }), { status: 400 });
    const { voteType } = await request.json();
    const field = voteType === 'downvote' ? 'helpful.downvotes' : 'helpful.upvotes';
    await sanityServer.patch(reviewId).inc({ [field]: 1 }).commit();
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error: any) {
    console.error('[api/reviews/vote] failed', error?.message || error);
    return new Response(JSON.stringify({ error: 'Failed to vote' }), { status: 500 });
  }
};
