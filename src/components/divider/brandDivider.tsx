'use client';

import clsx from 'clsx';

type BrandDividerProps = {
  className?: string;
};

function BrandDivider({ className }: BrandDividerProps) {
  return (
    <section
      id="BrandDivider"
      className={clsx(
        'relative flex justify-center py-4 mb-6 sm:py-6 sm:mb-8 lg:py-8 lg:mb-10',
        className
      )}
    >
      <div className="inline-flex items-center gap-3 rounded-full border border-white/20 bg-gradient-to-r from-white/10 via-white/5 to-transparent px-4 py-2 backdrop-blur-sm">
        <span className="font-borg text-primary text-base sm:text-xl">F.a.S.</span>
        <span className="font-ethno text-white text-base sm:text-xl">Motorsports</span>
      </div>
    </section>
  );
}

export default BrandDivider;
