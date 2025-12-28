import type { APIRoute } from 'astro';
import { sanityServer } from '@/lib/sanityServer';
import { reviewSubmitRequestSchema } from '@/lib/validators/api-requests';

export const POST: APIRoute = async ({ request }) => {
  try {
    const bodyResult = reviewSubmitRequestSchema.safeParse(await request.json());
    if (!bodyResult.success) {
      console.error('[validation-failure]', {
        schema: 'reviewSubmitRequestSchema',
        context: 'api/reviews/submit',
        identifier: 'unknown',
        timestamp: new Date().toISOString(),
        errors: bodyResult.error.format()
      });
      return new Response(
        JSON.stringify({ error: 'Validation failed', details: bodyResult.error.format() }),
        { status: 422 }
      );
    }
    const {
      productId,
      customerId,
      rating,
      title,
      content,
      images,
      pros,
      cons,
      customerName,
      customerEmail
    } = bodyResult.data;

    const hasPurchased = await sanityServer.fetch(
      `count(*[_type == "order" && references($customerId) && references($productId) && paymentStatus == "paid"]) > 0`,
      { customerId, productId }
    );

    const existingReview = await sanityServer.fetch(
      `*[_type == "review" && references($customerId) && references($productId)][0]._id`,
      { customerId, productId }
    );

    if (existingReview) {
      return new Response(JSON.stringify({ error: 'You have already reviewed this product' }), { status: 400 });
    }

    const review = await sanityServer.create({
      _type: 'review',
      product: { _type: 'reference', _ref: productId },
      customer: { _type: 'reference', _ref: customerId },
      customerName,
      customerEmail,
      rating,
      title,
      content,
      images: images || [],
      pros: pros || [],
      cons: cons || [],
      verifiedPurchase: !!hasPurchased,
      status: 'pending',
      submittedAt: new Date().toISOString()
    });

    return new Response(JSON.stringify({ review }), { status: 201 });
  } catch (error: any) {
    console.error('[api/reviews/submit] failed', error?.message || error);
    return new Response(JSON.stringify({ error: 'Failed to submit review' }), { status: 500 });
  }
};
