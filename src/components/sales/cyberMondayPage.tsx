import PricingCards from './pricingCardsCyberMonday';

export default function SalePage() {
  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-zinc-800">
        <img
          src="/images/sales/cyberMondayBanner.png"
          alt="Cyber Monday Sale Background"
          style={{ filter: 'brightness(0.2) blur(2px)' }}
          className="absolute inset-0 h-full w-full object-contain object-right"
        />
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-black/100 via-black/80 to-transparent" />
        <div className="relative z-10 mx-auto max-w-6xl px-4 py-16 md:grid md:grid-cols-2 md:items-center md:gap-12 md:py-24">
          {/* Left column */}
          <div className="space-y-6">
            <div className="font-borg inline-flex items-center gap-2 rounded-full border border-primaryB/60 shadow-card-outter shadow-inner shadow-white/60 px-3 py-1 text-xs font-medium uppercase tracking-wide bg-black">
              Cyber Monday 2025
              <span className="h-1 w-1 rounded-full" />
              Limited-time sale
            </div>

            <h1 className="text-shadow-soft text-4xl font-ethno font-bold tracking-tight sm:text-5xl lg:text-6xl">
              <span className="italic text-black text-glow-primary font-borg">Cyber </span> Monday{' '}
              <p>
                at
                <span className="text-black text-glow-primary font-borg italic">F.a.S.</span>{' '}
              </p>
              <span className="underline italic text-primaryB/60 text-shadow-strong">
                Motorsports
              </span>
            </h1>

            <p className="max-w-xl text-sm text-zinc-300 sm:text-base">
              10% off our most popular 2025 products and premium porting packages. Maximize your
              performance with porting packages at unbeatable Cyber Monday pricing— don't miss out
              on these exclusive savings!
            </p>

            {/* Mobile/Desktop button (visible on mobile; also keeps a call-to-action if right column is hidden) */}
          </div>
          {/* Right column kept open to showcase the hero artwork */}
          <div className="hidden md:flex md:items-center md:justify-end">
            <a
              href="/sales/cyberMonday"
              className="btn-plain inline-flex items-center gap-2 rounded-full border border-red-500/60 bg-red-600/30 px-5 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-[0_0_30px_rgba(248,113,113,0.35)] transition hover:border-red-400 hover:bg-red-600/40"
            >
              Shop All Cyber Deals →
            </a>
          </div>
        </div>
      </section>

      <section>
        <PricingCards />
      </section>
    </main>
  );
}
