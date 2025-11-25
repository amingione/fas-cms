import React, { useEffect, useState } from 'react';

type Promotion = {
  _id: string;
  title?: string;
  code?: string;
  displayName?: string;
  schedule?: { endDate?: string };
};

export function PromotionBanner() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);

  useEffect(() => {
    fetch('/api/promotions/active')
      .then((res) => res.json())
      .then((data) => setPromotions(Array.isArray(data) ? data : []))
      .catch((err) => console.warn('Unable to load promotions', err));
  }, []);

  if (promotions.length === 0) return null;

  const promo = promotions[0];

  return (
    <div className="bg-gradient-to-r from-red-600 to-pink-600 text-white py-3 px-4 text-center">
      <p className="font-semibold">
        {promo.displayName || promo.title}
        {promo.code && (
          <span className="ml-2 bg-white text-red-600 px-3 py-1 rounded font-mono">{promo.code}</span>
        )}
        {promo.schedule?.endDate && (
          <span className="ml-2 text-sm opacity-90">
            Ends {new Date(promo.schedule.endDate).toLocaleDateString()}
          </span>
        )}
      </p>
    </div>
  );
}

export default PromotionBanner;
