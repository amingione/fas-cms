import React, { useState } from 'react';

type FormState = {
  rating: number;
  title: string;
  content: string;
  pros: string[];
  cons: string[];
};

export function ReviewForm({ productId, customerId }: { productId: string; customerId: string }) {
  const [formData, setFormData] = useState<FormState>({
    rating: 5,
    title: '',
    content: '',
    pros: [],
    cons: []
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const response = await fetch('/api/reviews/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, customerId, ...formData })
    });

    if (response.ok) {
      alert('Thank you for your review! It will be published after moderation.');
      setFormData({ rating: 5, title: '', content: '', pros: [], cons: [] });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block font-semibold mb-2">Rating</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setFormData({ ...formData, rating: star })}
              className="text-3xl"
            >
              {star <= formData.rating ? '⭐' : '☆'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block font-semibold mb-2">Review Title</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full border rounded px-3 py-2"
          required
          maxLength={100}
        />
      </div>

      <div>
        <label className="block font-semibold mb-2">Your Review</label>
        <textarea
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          className="w-full border rounded px-3 py-2"
          rows={5}
          required
          minLength={10}
          maxLength={2000}
        />
      </div>

      <button
        type="submit"
        className="bg-blue-600 text-white px-6 py-3 rounded font-semibold hover:bg-blue-700"
      >
        Submit Review
      </button>
    </form>
  );
}

export default ReviewForm;
