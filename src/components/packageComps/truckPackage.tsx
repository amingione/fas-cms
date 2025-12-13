'use client';

import { ChevronDoubleRightIcon } from '@heroicons/react/20/solid';

const bullets = [
  {
    label: 'Dyno proven targets',
    body: 'Every package is validated in-house with baseline pulls, incremental revisions, and final verification so you know exactly what power to expect when you leave.'
  },
  {
    label: 'Factory-level drivability',
    body: 'We calibrate throttle, shift logic, cold-start and idle using OEM tools so the truck or car behaves like stock until you stand on the throttle.'
  },
  {
    label: 'Transparent parts list',
    body: 'Each build sheet documents hardware, torque specs, and service intervals—making future maintenance simple whether you stay with FAS or wrench at home.'
  }
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
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-pretty font-ethno italic text-primary sm:text-5xl">
            Truck Packages That Deliver.{' '}
            <span className="text-white/70">Strength. Speed. Support.</span>
          </h1>
          <p className="mt-6 text-xl text-gray-300">
            <span className="font-borg italic text-white">F.A.S. </span>
            <span className="font-ethno text-primaryB italic">Motorsports</span> truck packages are
            engineered for the modern street-driven TRX, Raptor, and high-output pickup platforms.
            We upgrade the drivetrain, cooling, and calibration to withstand real payloads, real
            road trips, and real power.
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
                  id="e87443c8-56e4-4c20-9111-55b82fa704e3"
                  width={200}
                  height={200}
                  patternUnits="userSpaceOnUse"
                >
                  <path d="M0.5 0V200M200 0.5L0 0.499983" />
                </pattern>
              </defs>
              <rect
                fill="url(#e87443c8-56e4-4c20-9111-55b82fa704e3)"
                width="100%"
                height="100%"
                strokeWidth={0}
              />
            </svg>
            <figure className="border-l border-primary pl-8">
              <blockquote className="text-base font-mono tracking-wide text-white/90">
                <p>
                  “FAS handled the entire package—pulley swap, fuel system, porting, and
                  calibration. The truck still cruises like stock, but it’s a completely different
                  animal when you lay into it. The datalogs, dyno sheets, and follow-up support were
                  worth every penny.”
                </p>
              </blockquote>
            </figure>
          </div>
          <div className="max-w-xl text-base text-gray-400 lg:col-span-7">
            <p>
              Whether you're towing, daily driving, or going all-out at the strip, we start with a
              full inspection and plan the build based on your usage, climate, and fuel goals. After
              install, we run diagnostics, road test, and verify on the dyno before final delivery.
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
              Whether it’s a 800 HP street build or a 1600 HP track truck, we document every
              calibration revision, torque spec, and component change. That transparency keeps your
              investment easy to service and ready for the next round of upgrades.
            </p>
            <h2 className="mt-16 text-2xl font-bold tracking-tight text-white">
              No guesswork. Just results.
            </h2>
            <p className="mt-6">
              Schedule your truck build consultation today. We'll help you spec out a reliable,
              high-torque combo that works as hard as it plays—with the drivability to match and the
              documentation to back it up.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
