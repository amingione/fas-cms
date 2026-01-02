import { useEffect, useState } from 'react';

type ReviewSummary = {
  average: number;
  total: number;
  distribution: Record<string, number>;
};

type Review = {
  _id: string;
  rating: number;
  title: string;
  content: string;
  customerName?: string;
  verifiedPurchase?: boolean;
  submittedAt?: string;
  pros?: string[];
  cons?: string[];
  images?: Array<{ asset?: { url?: string }; caption?: string }>;
  helpfulness?: { upvotes?: number; downvotes?: number };
  response?: { content?: string };
};

const Star = ({ filled }: { filled: boolean }) => (
  <span className={filled ? 'text-yellow-400' : 'text-gray-300'}>★</span>
);

function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="border rounded-lg p-6">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} filled={star <= review.rating} />
              ))}
            </div>
            {review.verifiedPurchase && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                ✓ Verified Purchase
              </span>
            )}
          </div>
          <h4 className="font-semibold">{review.title}</h4>
        </div>
        <div className="text-sm text-gray-600">
          {review.submittedAt ? new Date(review.submittedAt).toLocaleDateString() : null}
        </div>
      </div>

      <p className="text-gray-300 mb-3">{review.content}</p>

      {review.pros?.length ? (
        <div className="mb-2">
          <p className="font-semibold text-green-700">Pros:</p>
          <ul className="list-disc list-inside text-sm">
            {review.pros.map((pro, i) => (
              <li key={i}>{pro}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {review.cons?.length ? (
        <div className="mb-3">
          <p className="font-semibold text-red-700">Cons:</p>
          <ul className="list-disc list-inside text-sm">
            {review.cons.map((con, i) => (
              <li key={i}>{con}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {review.images?.length ? (
        <div className="flex gap-2 mb-3">
          {review.images.map((img, i) => (
            <img
              key={i}
              src={img.asset?.url}
              alt={img.caption}
              className="w-20 h-20 object-cover rounded"
            />
          ))}
        </div>
      ) : null}

      <div className="flex items-center gap-4 text-sm">
        <span className="text-gray-600">By {review.customerName || 'Customer'}</span>
        <button className="text-gray-600 hover:text-gray-900">
          👍 Helpful ({review.helpfulness?.upvotes ?? 0})
        </button>
      </div>

      {review.response?.content && (
        <div className="mt-4 bg-gray-50 p-4 rounded">
          <p className="font-semibold text-sm mb-1">Response from FAS Motorsports:</p>
          <p className="text-sm">{review.response.content}</p>
        </div>
      )}
    </div>
  );
}

export function ProductReviews({
  productId,
  reviewSummary
}: {
  productId: string;
  reviewSummary: ReviewSummary;
}) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    fetch(`/api/products/${productId}/reviews?sort=${sortBy}`)
      .then((res) => res.json())
      .then((data) => setReviews(Array.isArray(data) ? data : []))
      .catch((err) => console.warn('Unable to fetch reviews', err));
  }, [productId, sortBy]);

  return (
    <div className="reviews-section">
      <div className="review-summary mb-8">
        <div className="flex items-center gap-4">
          <div className="text-5xl font-bold">{reviewSummary.average?.toFixed(1)}</div>
          <div>
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} filled={star <= Math.round(reviewSummary.average)} />
              ))}
            </div>
            <p className="text-gray-600">Based on {reviewSummary.total} reviews</p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {[5, 4, 3, 2, 1].map((rating) => {
            const distributionKeys = [
              'oneStar',
              'twoStars',
              'threeStars',
              'fourStars',
              'fiveStars'
            ];
            const key = distributionKeys[rating - 1] || '';
            const count = reviewSummary.distribution?.[key] || 0;
            const percentage = reviewSummary.total ? (count / reviewSummary.total) * 100 : 0;

            return (
              <div key={rating} className="flex items-center gap-2">
                <span className="w-12">{rating} ⭐</span>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-yellow-400 h-2 rounded-full"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="w-12 text-sm text-gray-600">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">Customer Reviews</h3>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="newest">Newest First</option>
          <option value="highest">Highest Rated</option>
          <option value="lowest">Lowest Rated</option>
          <option value="helpful">Most Helpful</option>
        </select>
      </div>

      <div className="space-y-6">
        {reviews.map((review) => (
          <ReviewCard key={review._id} review={review} />
        ))}
      </div>
    </div>
  );
}

export default ProductReviews;
