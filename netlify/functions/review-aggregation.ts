import type { Handler } from '@netlify/functions';
import { sanity } from './_sanity';
import { updateProductReviewStats } from '../../src/server/sanity/reviews';

export const handler: Handler = async (event) => {
  try {
    const payload = event.body ? JSON.parse(event.body) : {};
    const productId =
      payload.productId ||
      payload?.product?._ref ||
      payload?.product?._id ||
      payload?.document?.product?._ref ||
      payload?.document?.product?._id;

    if (!productId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing productId' }) };
    }

    await updateProductReviewStats(sanity, productId as string);
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (error: any) {
    console.error('[review-aggregation] failed', error?.message || error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to aggregate reviews' }) };
  }
};

export default { handler };
