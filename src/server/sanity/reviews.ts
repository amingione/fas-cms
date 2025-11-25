import type { SanityClient } from '@sanity/client';

export async function updateProductReviewStats(client: SanityClient, productId: string) {
  const reviews: Array<{ rating: number; submittedAt?: string }> = await client.fetch(
    `*[_type == "review" && references($productId) && status == "approved"]{ rating, submittedAt }`,
    { productId }
  );

  if (!reviews.length) return;

  const totalReviews = reviews.length;
  const sumRatings = reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
  const averageRating = sumRatings / totalReviews;

  const distribution = {
    fiveStars: reviews.filter((r) => r.rating === 5).length,
    fourStars: reviews.filter((r) => r.rating === 4).length,
    threeStars: reviews.filter((r) => r.rating === 3).length,
    twoStars: reviews.filter((r) => r.rating === 2).length,
    oneStar: reviews.filter((r) => r.rating === 1).length
  } as const;

  const recommendationPercentage =
    ((distribution.fiveStars + distribution.fourStars) / totalReviews) * 100;

  const lastReviewedAt = reviews
    .map((r) => new Date(r.submittedAt || Date.now()))
    .sort((a, b) => b.getTime() - a.getTime())[0]
    .toISOString();

  await client
    .patch(productId)
    .set({
      'reviews.averageRating': Math.round(averageRating * 100) / 100,
      'reviews.totalReviews': totalReviews,
      'reviews.ratingDistribution': distribution,
      'reviews.recommendationPercentage': Math.round(recommendationPercentage),
      'reviews.lastReviewedAt': lastReviewedAt
    })
    .commit();
}
