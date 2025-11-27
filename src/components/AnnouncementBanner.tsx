import { useEffect, useRef, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/20/solid';

export default function AnnouncementBanner() {
  const [isOpen, setIsOpen] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    const updateOffset = () => {
      const height =
        isOpen && bannerRef.current ? bannerRef.current.getBoundingClientRect().height : 0;
      document.documentElement.style.setProperty('--announcement-offset', `${height}px`);
    };

    updateOffset();
    window.addEventListener('resize', updateOffset);

    return () => {
      document.documentElement.style.setProperty('--announcement-offset', '0px');
      window.removeEventListener('resize', updateOffset);
    };
  }, [isOpen]);

  const visible = isOpen && hasMounted;

  return (
    <div
      ref={bannerRef}
      className={`pointer-events-auto fixed inset-x-0 top-0 z-[100000] mx-auto w-full rounded-b-2xl border border-white/10 bg-black/70 px-4 py-3 shadow-2xl shadow-primary/20 backdrop-blur-lg transition-all duration-500 ease-out ${
        visible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      }`}
    >
      <div className="relative isolate flex flex-wrap items-center gap-4 overflow-hidden rounded-xl bg-gradient-to-r from-[#d11219]/85 via-[#7d0107]/90 to-[#fde4b2]/80 px-4 py-3 sm:gap-6 sm:px-5 after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-white/10 sm:before:flex-1 md:flex-nowrap md:gap-x-6">
        <div
          aria-hidden="true"
          className="absolute top-1/2 left-[max(-7rem,calc(50%-52rem))] -z-10 -translate-y-1/2 transform-gpu blur-2xl"
        >
          <div
            style={{
              clipPath:
                'polygon(74.8% 41.9%, 97.2% 73.2%, 100% 34.9%, 92.5% 0.4%, 87.5% 0%, 75% 28.6%, 58.5% 54.6%, 50.1% 56.8%, 46.9% 44%, 48.3% 17.4%, 24.7% 53.9%, 0% 27.9%, 11.9% 74.2%, 24.9% 54.1%, 68.6% 100%, 74.8% 41.9%)'
            }}
            className="aspect-577/310 w-144.25 bg-linear-to-r from-[#d11219] to-[#fde4b2] opacity-50"
          />
        </div>
        <div
          aria-hidden="true"
          className="absolute top-1/2 left-[max(45rem,calc(50%+8rem))] -z-10 -translate-y-1/2 transform-gpu blur-2xl"
        >
          <div
            style={{
              clipPath:
                'polygon(74.8% 41.9%, 97.2% 73.2%, 100% 34.9%, 92.5% 0.4%, 87.5% 0%, 75% 28.6%, 58.5% 54.6%, 50.1% 56.8%, 46.9% 44%, 48.3% 17.4%, 24.7% 53.9%, 0% 27.9%, 11.9% 74.2%, 24.9% 54.1%, 68.6% 100%, 74.8% 41.9%)'
            }}
            className="aspect-577/310 w-144.25 bg-linear-to-r from-[#7d0107] to-[#d11219] opacity-40"
          />
        </div>
        <p className="min-w-0 flex-1 text-sm/6 text-gray-50 md:min-w-fit md:flex-none">
          <a href="#" className="hover:text-white">
            <strong className="font-semibold">Black Friday 2025</strong>
            <svg viewBox="0 0 2 2" aria-hidden="true" className="mx-2 inline size-0.5 fill-current">
              <circle r={1} cx={1} cy={1} />
            </svg>
            <span className="font-semibold">Unlock 10% off featured products & services.</span>{' '}
            Click for a sneak peak into limited‑time doorbusters!
            <span aria-hidden="true" className="ml-1 inline-block">
              &rarr;
            </span>
          </a>
        </p>
        <div className="z-100 flex flex-shrink-0 justify-end md:flex-1 md:justify-end">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="btn-plain rounded-full px-3 py-2 text-black shadow-md shadow-black/30 ring-1 ring-black/10 transition hover:text-whitefocus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            aria-label="Dismiss announcement"
          >
            <XMarkIcon aria-hidden="true" className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
