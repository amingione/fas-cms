// BlackFridayHero.tsx
import { useEffect, useState } from 'react';
export function BlackFridayHero() {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    function getNextFriday() {
      const now = new Date();
      const day = now.getDay();
      const daysUntilFriday = (5 - day + 7) % 7 || 7;
      const target = new Date(now);
      target.setDate(now.getDate() + daysUntilFriday);
      target.setHours(0, 0, 0, 0);
      return target;
    }

    const targetDate = getNextFriday();

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetDate.getTime() - now;

      if (distance <= 0) {
        clearInterval(interval);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((distance / (1000 * 60)) % 60),
        seconds: Math.floor((distance / 1000) % 60)
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-black via-zinc-900 to-black text-white">
      <div className="absolute inset-0 bg-[url('/images/backgrounds/BFSaleBanner.png')] bg-cover bg-center opacity-30" />
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top,_#f97316,_transparent_60%),radial-gradient(circle_at_bottom,_#ef4444,_transparent_60%)]" />

      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-10 px-4 py-16 sm:px-6 lg:flex-row lg:items-stretch lg:py-24 lg:px-8">
        {/* Left: copy */}
        <div className="flex-1 space-y-6 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 rounded-full bg-zinc-900/70 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-400 ring-1 ring-amber-500/40">
            <span className="h-2 w-2 animate-ping rounded-full bg-amber-400" />
            <span>Black Friday Performance Sale</span>
          </div>

          <h1 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
            10% OFF on Performance Parts & Services
          </h1>

          <p className="max-w-xl text-sm text-zinc-300 sm:text-base">
            Save 10% on Predator Pulley Kits, Upper Pulley Kits, Billet Supercharger Snouts, Billet
            Lids, Supercharger & Snout Rebuilds, Hellcat Crank Pin Kits, 6.7L Powerstroke Piping
            Kits, Exhaust Elbows, and more.
          </p>

          {/* Countdown stub... */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs sm:text-sm lg:justify-start">
            <div className="flex items-center gap-2 rounded-full bg-zinc-900/70 px-4 py-2 ring-1 ring-zinc-700">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold">
                !
              </span>
              <span className="font-medium">
                Begins in {timeLeft.days}d : {timeLeft.hours}h : {timeLeft.minutes}m :{' '}
                {timeLeft.seconds}s
              </span>
            </div>
            <span className="text-zinc-400">
              Sale begins Friday at midnight. Discounts auto‑apply at launch.
            </span>
          </div>

          {/* CTA buttons hidden */}
        </div>

        {/* Right: product / promo card */}
        <div className="flex w-full max-w-md flex-1 justify-center lg:max-w-lg">
          <div className="relative w-full rounded-3xl bg-zinc-900/80 p-5 ring-1 ring-zinc-700/70 shadow-2xl">
            <div className="absolute -top-4 -right-4 rounded-full bg-gradient-to-br from-amber-400 to-red-500 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-black shadow-lg">
              10% OFF
            </div>

            <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-800 via-zinc-900 to-black">
              {/* Swap this block with an actual product image */}
              <div className="flex h-full items-center justify-center">
                <img
                  src="/images/sales/FAS-BLACKFRIDAY-SALE.png"
                  alt="Black Friday 2025 Featured Product"
                  className="h-full w-full object-fit"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-amber-400">
                  Billet Performance
                </p>
                <h2 className="text-sm font-semibold text-white sm:text-base">
                  Featured Black Friday Deal
                </h2>
                <p className="mt-1 text-xs text-zinc-400">
                  Hand-selected upgrade from this year’s lineup.
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs line-through text-zinc-500">$1,899.99</p>
                <p className="text-xl font-bold text-amber-400">$1,709.99</p>
                <p className="text-[10px] text-emerald-400">You save $190</p>
              </div>
            </div>

            {/* CTA hidden */}
          </div>
        </div>
      </div>
    </section>
  );
}
