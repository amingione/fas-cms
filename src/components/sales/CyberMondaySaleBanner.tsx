// CyberMondayHero.tsx
import { useEffect, useState } from 'react';

export function CyberMondayHero() {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    function getNextMonday() {
      const now = new Date();
      const day = now.getDay();
      const daysUntilMonday = (8 - day) % 7 || 7;
      const target = new Date(now);
      target.setDate(now.getDate() + daysUntilMonday);
      target.setHours(0, 0, 0, 0);
      return target;
    }

    const targetDate = getNextMonday();

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
    <section className="relative overflow-hidden bg-gradient-to-r from-black via-zinc-800 to-black text-white">
      <div className="absolute inset-0 bg-[url('/images/backgrounds/CyberMondayBanner.png')] bg-cover bg-center opacity-30" />
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top,_#3b82f6,_transparent_60%),radial-gradient(circle_at_bottom,_#8b5cf6,_transparent_60%)]" />

      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-10 px-4 py-16 sm:px-6 lg:flex-row lg:items-stretch lg:py-24 lg:px-8">
        {/* Left: copy */}
        <div className="flex-1 space-y-6 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 rounded-full bg-zinc-900/70 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-400 ring-1 ring-blue-500/40">
            <span className="h-2 w-2 animate-ping rounded-full bg-blue-400" />
            <span>Cyber Monday Mega Deal</span>
          </div>

          <h1 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
            Up to 15% OFF Select Performance Upgrades
          </h1>

          <p className="max-w-xl text-sm text-zinc-300 sm:text-base">
            Shop exclusive online-only deals on upgraded pulleys, billet hardware, cooling kits,
            rebuild services, tuning packages, and more. For one day only!
          </p>

          <div className="mt-4">
            <a
              href="/cyberMondaySale"
              className="inline-flex items-center gap-2 rounded-full bg-blue-500 px-6 py-2.5 text-sm font-semibold text-black shadow-lg shadow-blue-500/30 transition hover:-translate-y-0.5 hover:bg-blue-400"
            >
              Browse Cyber Monday Deals →
            </a>
          </div>
        </div>

        {/* Right: product / promo card */}
        <div className="flex w-full max-w-md flex-1 justify-center lg:max-w-lg">
          <div className="relative w-full rounded-3xl bg-zinc-900/80 p-5 ring-1 ring-zinc-700/70 shadow-2xl">
            <div className="absolute -top-4 -right-4 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-black shadow-lg">
              SAVE 15%
            </div>

            <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-800 via-zinc-900 to-black">
              <div className="flex h-full items-center justify-center">
                <img
                  src="/images/sales/CyberMondaySaleFAS.png"
                  alt="Cyber Monday 2025 Featured Product"
                  className="h-full w-full object-fit"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-blue-400">
                  Elite Performance
                </p>
                <h2 className="text-sm font-semibold text-white sm:text-base">
                  Cyber Monday Special Offer
                </h2>
                <p className="mt-1 text-xs text-zinc-400">Online-only premium upgrade bundle.</p>
              </div>
              <div className="text-right">
                <p className="text-xs line-through text-zinc-500">$2,499.99</p>
                <p className="text-xl font-bold text-blue-400">$2,124.99</p>
                <p className="text-[10px] text-emerald-400">You save $375</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
