import PricingCards from './pricingCards';

export default function SalePage() {
  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-zinc-800">
        <img
          src="/images/sales/cyberMondayBanner.png"
          alt="Cyber Monday Sale Background"
          style={{ filter: 'brightness(0.2) blur(3px)' }}
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-red-600/20 via-zinc-900 to-zinc-950 pointer-events-none" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 md:flex md:items-center md:gap-12 md:py-24">
          {/* Left column */}
          <div className="space-y-6 md:w-1/2">
            <div className="font-borg inline-flex items-center gap-2 rounded-full border border-primaryB/60 shadow-card-outter shadow-inner shadow-white/60 px-3 py-1 text-xs font-medium uppercase tracking-wide bg-dark">
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
              Save big on performance parts, packages, and custom installs. Build your street or
              track setup and lock in limited Cyber Monday pricing before it&apos;s gone.
            </p>
          </div>
        </div>
      </section>

      <section>
        <PricingCards />
      </section>
    </main>
  );
}
