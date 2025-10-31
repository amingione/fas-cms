import { CheckIcon } from '@heroicons/react/20/solid';

const features = [
  {
    name: 'Turbo & Supercharger Kits.',
    description: 'High-performance forced induction systems for maximum power.',
    icon: CheckIcon
  },
  {
    name: 'Exhaust Systems.',
    description: 'High-performance exhaust systems designed for maximum flow and sound.',
    icon: CheckIcon
  },
  {
    name: 'Complete Builds.',
    description: 'Bespoke vehicle transformations from the ground up.',
    icon: CheckIcon
  }
];

const heroImageSrcSet = [
  '/images/backgrounds/welding-fas-800.webp 800w',
  '/images/backgrounds/welding-fas-1200.webp 1200w',
  '/images/backgrounds/welding-fas.webp 1600w'
].join(', ');

const heroImageSizes = '(min-width: 1280px) 640px, (min-width: 768px) 80vw, 100vw';

export default function HeadingBanner1() {
  return (
    <div className="bg-blend-overlay mt-5 mb-12 sm:mb-16 lg:mb-24">
      <div className="mt-[-4px] mx-auto">
        <div className="relative isolate overflow-hidden bg-white/5 border border-rounded rounded-lg border-black/20 drop-shadow-lg shadow-white/10 shadow-inner backdrop-blur-sm px-2 py-10 after:pointer-events-none after:absolute after:inset-0 after:inset-ring after:inset-ring-white/10 sm:rounded-3xl sm:px-10 sm:py-24 after:sm:rounded-3xl lg:py-24 xl:px-24">
          <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 sm:gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-2 lg:items-center lg:gap-y-0">
            <div className="lg:row-start-2 lg:max-w-md">
              <h2 className="text-3xl font-semibold font-ethno tracking-tight text-balance text-white/70 sm:text-4xl">
                Custom Fabrication. Precision Engineering.
              </h2>
              <p className="mt-6 text-lg/8 text-white/70 font-mono">
                FAS Motorsports offers in-house custom fabrication services for performance and
                diesel platforms. From pipes and cats to full exhaust systems, our welding
                department designs and builds everything to spec — no compromises.
              </p>
            </div>
            <img
              alt="welding fas motorsports custom fabrication"
              src="/images/backgrounds/welding-fas.webp"
              width={2432}
              height={1442}
              loading="eager"
              decoding="async"
              sizes={heroImageSizes}
              srcSet={heroImageSrcSet}
              className="relative -z-20 max-w-xl fit min-w-full rounded-xl shadow-xl ring-1 ring-white/10 lg:row-span-4 lg:w-5xl lg:max-w-90%"
            />
            <div className="max-w-xl lg:row-start-3 lg:mt-10 lg:max-w-md lg:border-t lg:border-white/10 lg:pt-10">
              <dl className="max-w-xl space-y-8 text-base/7 text-gray-300 font-mono text-bold lg:max-w-none">
                {features.map((feature) => (
                  <div key={feature.name} className="relative">
                    <dt className="ml-9 inline-block font-semibold font-ethno tracking-widest text-white/50">
                      <feature.icon
                        aria-hidden="true"
                        className="absolute top-1 left-1 size-6 text-primary"
                      />
                      {feature.name}
                    </dt>{' '}
                    <dd className="inline">{feature.description}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-12 -z-10 -translate-y-1/2 transform-gpu blur-3xl lg:top-auto lg:-bottom-48 lg:translate-y-0"
          >
            <div
              style={{
                clipPath:
                  'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)'
              }}
              className="aspect-1155/678 w-288.75 bg-linear-to-tr from-[#66111b] to-[#8a8687a3] opacity-20"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
