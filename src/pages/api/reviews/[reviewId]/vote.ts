import type { APIRoute } from 'astro';
import { sanityServer } from '@/lib/sanityServer';
import { reviewVoteRequestSchema } from '@/lib/validators/api-requests';

export const POST: APIRoute = async ({ params, request }) => {
  try {
    const reviewId = params.reviewId;
    if (!reviewId) return new Response(JSON.stringify({ error: 'Missing reviewId' }), { status: 400 });
    const bodyResult = reviewVoteRequestSchema.safeParse(await request.json());
    if (!bodyResult.success) {
      console.error('[validation-failure]', {
        schema: 'reviewVoteRequestSchema',
        context: 'api/reviews/vote',
        identifier: reviewId || 'unknown',
        timestamp: new Date().toISOString(),
        errors: bodyResult.error.format()
      });
      return new Response(
        JSON.stringify({ error: 'Validation failed', details: bodyResult.error.format() }),
        { status: 422 }
      );
    }
    const { voteType } = bodyResult.data;
    const field = voteType === 'downvote' ? 'helpful.downvotes' : 'helpful.upvotes';
    await sanityServer.patch(reviewId).inc({ [field]: 1 }).commit();
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error: any) {
    console.error('[api/reviews/vote] failed', error?.message || error);
    return new Response(JSON.stringify({ error: 'Failed to vote' }), { status: 500 });
  }
};
