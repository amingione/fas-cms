import React from 'react';

type FeatureCarouselProps = {
  className?: string;
  children: React.ReactNode;
};

/**
 * Lightweight horizontal carousel shell with snap scrolling.
 * Wrap slides with `snap-start` and set a min-width per breakpoint.
 */
export default function FeatureCarousel({ children, className = '' }: FeatureCarouselProps) {
  return (
    <div className={`relative overflow-x-auto no-scrollbar ${className}`}>
      <div className="flex gap-4 snap-x snap-mandatory scroll-px-4 px-4">
        {children}
      </div>
    </div>
  );
}

