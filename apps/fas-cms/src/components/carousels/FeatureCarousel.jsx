import React from 'react';

/**
 * Lightweight horizontal carousel shell.
 * Usage:
 * <FeatureCarousel>
 *   <div className="snap-start min-w-[80%] md:min-w-[33%]">...</div>
 *   ...
 * </FeatureCarousel>
 */
export default function FeatureCarousel({ children, className = '' }) {
  return (
    <div className={`relative overflow-x-auto no-scrollbar ${className}`}>
      <div className="flex gap-4 snap-x snap-mandatory scroll-px-4 px-4">
        {children}
      </div>
    </div>
  );
}
