'use client';

import { ChevronDoubleRightIcon } from '@heroicons/react/20/solid';

const bullets = [
  {
    label: 'AWD dyno verified, every time',
    body: 'Every Hellcat build leaves our shop with full-pull datalogs and a final dyno sheet confirming the power target. Not an estimate — verified numbers on your specific vehicle.'
  },
  {
    label: 'Pinned crank is standard at 850 WHP and above',
    body: 'The factory Hellcat crank nose is not rated for sustained 850+ WHP. FAS pins every crank at that tier and up — it\'s a non-negotiable reliability item, not an upsell.'
  },
  {
    label: 'Fuel system matched to power level',
    body: 'From stock injectors at 800 WHP through full E85 conversion at 1000 WHP, we size the fuel system to the build — not the other way around. No lean pulls. No surprises.'
  }
];

const packages = [
  { tier: 'FAS800', hp: '800 WHP', fuel: '91–93 Oct', price: 'From $6,499', href: '/packages/fas800' },
  { tier: 'FAS850', hp: '850 WHP', fuel: '91–93 Oct', price: 'From $6,699', href: '/packages/fas850' },
  { tier: 'FAS900', hp: '900 WHP', fuel: '91–93 Oct', price: '$9,999', href: '/packages/fas900' },
  { tier: 'FAS1000', hp: '1000+ WHP', fuel: 'E85', price: 'From $16,999', href: '/packages/fas1000' },
  { tier: 'FAS 1X', hp: '1200–1500 HP', fuel: 'E85', price: 'Call for pricing', href: '/packages/fas-1x' },
  { tier: 'FAS 2X', hp: '1600+ HP', fuel: 'E85 + Meth', price: 'Call for pricing', href: '/packages/fas-2x' },
];

export default function PowerPackagesComponent() {
  return (
    <div className="relative isolate overflow-hidden bg-gray-900 py-24 sm:py-32">
      <div
        aria-hidden="true"
        className="absolute -top-80 left-[max(6rem,33%)] -z-10 transform-gpu blur-3xl sm:left-1/2 md:top-20 lg:ml-20 xl:top-3 xl:ml-56"
      >
        <div className="brand-blobs aspect-801/1036 w-200.25 bg-linear-to-tr from-[#00000029] to-[#000000] opacity-20" />
      </div>
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:mx-0">
          <h2 className="mt-2 text-4xl font-semibold tracking-tight text-pretty font-ethno italic text-primary sm:text-5xl">
            Hellcat Platform.{' '}
            <span className="text-white/70">800 to 1600+ WHP.</span>
          </h2>
          <p className="mt-6 text-xl text-gray-300">
            <span className="font-borg italic text-white">FAS </span>
            <span className="font-ethno text-primaryB italic">Motorsports</span> power packages
            cover every tier of the Hellcat supercharged platform — Charger, Challenger,
            Trackhawk, Durango SRT, and RAM TRX. Street-daily to full drag program, every build
            is installed and calibrated at our Punta Gorda, FL shop.
          </p>
        </div>
        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 lg:mx-0 lg:mt-10 lg:max-w-none lg:grid-cols-12">
          <div className="relative lg:order-last lg:col-span-5">
            <svg
              aria-hidden="true"
              className="absolute -top-160 left-1 -z-10 h-256 w-702 -translate-x-1/2 mask-[radial-gradient(64rem_64rem_at_111.5rem_0%,white,transparent)] stroke-white/10"
            >
              <defs>
                <pattern
                  id="power-pkg-grid"
                  width={200}
                  height={200}
                  patternUnits="userSpaceOnUse"
                >
                  <path d="M0.5 0V200M200 0.5L0 0.499983" />
                </pattern>
              </defs>
              <rect fill="url(#power-pkg-grid)" width="100%" height="100%" strokeWidth={0} />
            </svg>

            {/* Package ladder */}
            <div className="space-y-2">
              <p className="text-xs font-mono tracking-widest text-white/40 uppercase mb-3">Full Package Ladder</p>
              {packages.map((pkg) => (
                <a
                  key={pkg.tier}
                  href={pkg.href}
                  className="flex items-center justify-between gap-4 rounded border border-white/10 bg-white/5 px-4 py-3 hover:border-red-500/40 hover:bg-white/10 transition-colors group"
                >
                  <div>
                    <span className="block text-sm font-semibold text-white group-hover:text-red-400 transition-colors">{pkg.tier}</span>
                    <span className="block text-xs text-white/50">{pkg.fuel}</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-sm font-mono text-white/80">{pkg.hp}</span>
                    <span className="block text-xs text-white/40">{pkg.price}</span>
                  </div>
                </a>
              ))}
            </div>
          </div>

          <div className="max-w-xl text-base text-gray-400 lg:col-span-7">
            <p>
              Every build starts with a baseline inspection and a power target matched to your
              platform, fuel, and goals. We work up the build sheet, install everything in-house,
              heat-cycle the vehicle, and run final dyno pulls before you see the car.
            </p>
            <ul role="list" className="mt-8 max-w-xl space-y-8 text-gray-400">
              {bullets.map(({ label, body }) => (
                <li key={label} className="flex gap-x-3">
                  <ChevronDoubleRightIcon
                    aria-hidden="true"
                    className="mt-1 size-5 flex-none text-accent"
                  />
                  <span>
                    <strong className="font-semibold text-white">{label}.</strong> {body}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-8">
              At 800 WHP you're running pump gas, factory drivability, and a street tune that
              works in traffic. At 1000 WHP you're on E85, race-ported supercharger, longtube
              headers, and a full custom calibration. Every tier in between is a clean step, not a
              gamble.
            </p>
            <h2 className="mt-16 text-2xl font-bold tracking-tight text-white">
              Pick your power level. We handle the rest.
            </h2>
            <p className="mt-6">
              Use the package ladder to find your tier, or call us to talk through your platform,
              fuel choice, and target. We'll spec the build and give you a straight answer on
              timeline and cost before anything gets ordered.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="/shop?categorySlug=power-packages&category=power-packages&priceMin=0&priceMax=100000&page=1"
                className="inline-flex items-center gap-2 rounded bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-500 transition-colors"
              >
                Shop All Packages
              </a>
              <a
                href="/contact"
                className="inline-flex items-center gap-2 rounded border border-white/20 px-5 py-2.5 text-sm font-semibold text-white hover:border-white/40 transition-colors"
              >
                Talk to a Builder
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
