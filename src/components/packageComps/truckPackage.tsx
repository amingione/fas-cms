'use client';

import { ChevronDoubleRightIcon } from '@heroicons/react/20/solid';

const bullets = [
  {
    label: 'TRX stays street-legal and tow-capable',
    body: 'Every TRX build is calibrated for real-world use — OEM shift logic, cold-start behavior, and tow mode all preserved. 800 WHP without losing the truck.'
  },
  {
    label: 'F-150 EcoBoost twin turbo, not a kit install',
    body: 'Our F-150 packages are FAS-spec systems — purpose-built turbochargers, stainless plumbing, and HP Tuners calibration specific to your truck. No off-the-shelf kits, no compromise on fueling.'
  },
  {
    label: 'Every truck is dyno verified before delivery',
    body: 'TRX and F-150 both get baseline pulls, full install, and final dyno verification at our AWD facility in Punta Gorda, FL before we hand back the keys.'
  }
];

const trxPackages = [
  { tier: 'FAS800 TRX', hp: '800 WHP', fuel: '91–93 Oct', price: '$6,699', href: '/packages/fas800' },
  { tier: 'FAS850 TRX', hp: '850 WHP', fuel: '91–93 Oct', price: '$7,499', href: '/packages/fas850' },
  { tier: 'FAS900 TRX', hp: '900 WHP', fuel: '91–93 Oct', price: '$9,999', href: '/packages/fas900' },
  { tier: 'FAS1000 TRX', hp: '1000+ WHP', fuel: 'E85', price: '$17,999', href: '/packages/fas1000' },
  { tier: 'FAS 1X TRX', hp: '1200–1500 HP', fuel: 'E85', price: 'Call', href: '/packages/fas-1x' },
  { tier: 'FAS 2X TRX', hp: '1600+ HP', fuel: 'E85 + Meth', price: 'Call', href: '/packages/fas-2x' },
];

const f150Packages = [
  { tier: 'FAS500 F-150', hp: '600 WHP', fuel: '91–93 Oct', price: '$7,499', href: '/packages/fas500' },
  { tier: 'FAS800 F-150', hp: '800 WHP', fuel: 'E40–E85', price: 'Contact', href: '/packages/truckPackages' },
  { tier: 'FAS1000 F-150', hp: '1000+ WHP', fuel: 'E85', price: 'Call', href: '/contact' },
];

export default function TruckPackagesComponent() {
  return (
    <div className="relative isolate overflow-hidden bg-dark border border-rounded rounded-md shadow-inner shadow-white/20 py-24 sm:py-32">
      <div
        aria-hidden="true"
        className="absolute -top-80 left-[max(6rem,33%)] -z-10 transform-gpu blur-3xl sm:left-1/2 md:top-20 lg:ml-20 xl:top-3 xl:ml-56"
      >
        <div className="brand-blobs aspect-801/1036 w-200.25 bg-linear-to-tr from-[#00000029] to-[#000000] opacity-20" />
      </div>
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:mx-0">
          <h2 className="mt-2 text-4xl font-semibold tracking-tight text-pretty font-ethno italic text-primary sm:text-5xl">
            RAM TRX & F-150.{' '}
            <span className="text-white/70">Street Power. Track Ready.</span>
          </h2>
          <p className="mt-6 text-xl text-gray-300">
            <span className="font-borg italic text-white">FAS </span>
            <span className="font-ethno text-primaryB italic">Motorsports</span> builds more TRX
            trucks than any shop in the country, and our F-150 twin turbo program is the
            most comprehensive EcoBoost build on the market. Both platforms, one shop, fully
            installed and dyno-verified in Punta Gorda, FL.
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 lg:mx-0 lg:mt-10 lg:max-w-none lg:grid-cols-12">
          <div className="relative lg:order-last lg:col-span-5 space-y-6">
            <svg
              aria-hidden="true"
              className="absolute -top-160 left-1 -z-10 h-256 w-702 -translate-x-1/2 mask-[radial-gradient(64rem_64rem_at_111.5rem_0%,white,transparent)] stroke-white/10"
            >
              <defs>
                <pattern
                  id="truck-pkg-grid"
                  width={200}
                  height={200}
                  patternUnits="userSpaceOnUse"
                >
                  <path d="M0.5 0V200M200 0.5L0 0.499983" />
                </pattern>
              </defs>
              <rect fill="url(#truck-pkg-grid)" width="100%" height="100%" strokeWidth={0} />
            </svg>

            {/* TRX ladder */}
            <div>
              <p className="text-xs font-mono tracking-widest text-white/40 uppercase mb-3">RAM TRX Packages</p>
              <div className="space-y-2">
                {trxPackages.map((pkg) => (
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

            {/* F150 ladder */}
            <div>
              <p className="text-xs font-mono tracking-widest text-white/40 uppercase mb-3">Ford F-150 Packages</p>
              <div className="space-y-2">
                {f150Packages.map((pkg) => (
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
          </div>

          <div className="max-w-xl text-base text-gray-400 lg:col-span-7">
            <p>
              TRX builds run the full Hellcat supercharged platform ladder from 800 to 1600+ WHP.
              The 6.2L responds well to the FAS build sheet at every tier — and every stage
              retains factory towing and drivability until you get on the throttle. F-150 builds
              start at 600 WHP with our twin 54mm turbo system and scale through 800 and 1000 WHP
              with progressively larger turbos and fuel systems.
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
              Both platforms leave our shop with datalogs, a dyno sheet, and a full build record.
              If you need the truck back at a certain date, tell us up front and we'll schedule
              accordingly. No vehicle leaves until the numbers are confirmed.
            </p>
            <h2 className="mt-16 text-2xl font-bold tracking-tight text-white">
              Pick your platform and your power level.
            </h2>
            <p className="mt-6">
              Use the package reference above to find your tier, then contact us to confirm
              compatibility and lock in a build slot. We'll walk you through fuel requirements,
              timeline, and any platform-specific considerations before anything gets ordered.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="/shop?categorySlug=truck-packages&category=truck-packages&priceMin=0&priceMax=100000&page=1"
                className="inline-flex items-center gap-2 rounded bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-500 transition-colors"
              >
                Shop Truck Packages
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
