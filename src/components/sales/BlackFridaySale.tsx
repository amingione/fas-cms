import PricingCards from './pricingCards';

const saleItems = [
  {
    id: 'coilovers',
    name: 'Performance Coilover Kits',
    badge: 'Up to 25% OFF',
    desc: 'Dial in your ride height and handling for street and track.',
    price: 'From $799',
    href: '/products?category=coilovers&tag=black-friday'
  },
  {
    id: 'wheels',
    name: 'Wheel & Tire Packages',
    badge: 'Save up to $400',
    desc: 'Mounted, balanced, and ready to bolt on with aggressive fitments.',
    price: 'From $1,299',
    href: '/products?category=wheels&tag=black-friday'
  },
  {
    id: 'exhaust',
    name: 'Exhaust & Downpipes',
    badge: '15% OFF',
    desc: 'Unleash sound and power with premium exhaust systems.',
    price: 'From $499',
    href: '/products?category=exhaust&tag=black-friday'
  },
  {
    id: 'tuning',
    name: 'Tuning & Installs',
    badge: 'Shop & Labor Deals',
    desc: 'Black Friday pricing on select installs and dyno/tuning slots.',
    price: 'Limited slots',
    href: '/services?tag=black-friday'
  }
];

export default function SalePage() {
  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-zinc-800">
        <img
          src="/images/backgrounds/BFSaleBanner.png"
          alt="Black Friday Sale Background"
          style={{ filter: 'brightness(0.7) blur(2px)' }}
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-red-600/20 via-zinc-900 to-zinc-950 pointer-events-none" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 md:flex md:items-center md:gap-12 md:py-24">
          {/* Left column */}
          <div className="md:w-1/2 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide text-red-300">
              Black Friday 2025
              <span className="h-1 w-1 rounded-full bg-red-400" />
              Limited-time sale
            </div>

            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Black Friday at <span className="text-red-400">F.A.S. Motorsports</span>
            </h1>

            <p className="max-w-xl text-sm sm:text-base text-zinc-300">
              Save big on performance parts, wheel packages, and custom installs in Fort Myers,
              Florida. Build your street or track setup and lock in limited Black Friday pricing
              before it&apos;s gone.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a
                href="/products?tag=black-friday"
                className="inline-flex items-center justify-center rounded-md bg-red-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-red-500/30 transition hover:bg-red-400"
              >
                Shop all Black Friday deals
              </a>
              <a
                href="/contact?type=install&source=black-friday"
                className="inline-flex items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 px-6 py-3 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500"
              >
                Book install special
              </a>
            </div>

            <div className="flex flex-wrap gap-4 pt-4 text-xs text-zinc-400">
              <div className="flex items-center gap-2">
                <span className="h-5 w-5 rounded-full border border-zinc-700 bg-zinc-900 flex items-center justify-center text-[10px]">
                  FL
                </span>
                Fort Myers-based installs & fabrication
              </div>
              <div className="flex items-center gap-2">
                <span className="h-5 w-5 rounded-full border border-zinc-700 bg-zinc-900 flex items-center justify-center text-[10px]">
                  ⭐
                </span>
                Trusted by local street & track builds
              </div>
            </div>
          </div>

          {/* Right column visual */}
          <div className="mt-10 md:mt-0 md:w-1/2">
            <div className="relative rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 p-4 shadow-2xl">
              <div className="rounded-xl bg-zinc-900/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-red-400">
                  Featured doorbusters
                </p>
                <ul className="mt-3 space-y-2 text-sm">
                  <li className="flex items-center justify-between rounded-lg bg-zinc-900/80 px-3 py-2">
                    <span>Coilover kits</span>
                    <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] text-red-300">
                      Up to 25% OFF
                    </span>
                  </li>
                  <li className="flex items-center justify-between rounded-lg bg-zinc-900/80 px-3 py-2">
                    <span>Wheel & tire packages</span>
                    <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] text-red-300">
                      Save up to $400
                    </span>
                  </li>
                  <li className="flex items-center justify-between rounded-lg bg-zinc-900/80 px-3 py-2">
                    <span>Exhaust & downpipes</span>
                    <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] text-red-300">
                      15% OFF
                    </span>
                  </li>
                </ul>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-zinc-400">
                <span>While inventory lasts • No rain checks</span>
                <span className="rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-red-300">
                  Black Friday only
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <PricingCards />
      </section>
    </main>
  );
}
