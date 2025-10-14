'use client';

const FEATURE_TAGS = [
  'Billet-machined',
  'In-house tuning',
  'Track proven',
  'Install support'
] as const;

const SELLING_POINTS = [
  {
    title: 'Engineered for repeatable gains',
    body: 'Every Predator pulley leaves the shop with matched hardware, belt path guidance, and install notes so your crew can bolt on performance without guesswork.'
  },
  {
    title: 'Ready when your build is',
    body: 'We stage small production runs weekly, keeping core parts on deck while larger custom orders move through the CNC and anodize queue.'
  },
  {
    title: 'Support from the same techs who build',
    body: 'Need torque specs or a sanity check on fuel before a dyno session? Our installers and tuners share the same bench, which means fast answers for your team.'
  },
  {
    title: 'Confidence after the install',
    body: 'Break-in checklists, warranty registration, and post-install tune revisions are prepped before your kit ships so you are never waiting on paperwork.'
  }
] as const;

export default function HeadingBanner() {
  return (
    <section className="bg-transparent text-white">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-transparent p-6 lg:col-span-1">
            <div
              className="relative mb-6 flex h-56 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-transparent p-6"
              style={{
                backgroundImage:
                  'radial-gradient(circle at center, rgba(255,255,255,0.06) 1px, transparent 1px)',
                backgroundSize: '20px 20px'
              }}
            >
              <div className="absolute left-1/4 -translate-x-1/2">
                <img
                  src="/images/billetParts/fas-pred-pully.png"
                  alt="Predator pulley"
                  className="h-32 w-32 rounded-full object-contain"
                  loading="lazy"
                />
              </div>
              <div className="absolute right-1/4 translate-x-1/2">
                <img
                  src="/images/billetParts/predator-pulley-fas.png"
                  alt="Predator pulley detail"
                  className="h-28 w-28 rounded-full object-contain"
                  loading="lazy"
                />
              </div>
            </div>

            <h3 className="text-base font-semibold uppercase tracking-[0.2em] text-white/70">
              FAS Performance Lab
            </h3>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Predator pulley packages you can push on day one.
            </p>
            <p className="mt-4 text-sm leading-6 text-white/60">
              Built for late-night installs and weekend track passes, this is the flagship hardware
              our crew runs on personal builds—now ready for yours.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {FEATURE_TAGS.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/70"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-transparent p-0 lg:col-span-2">
            <div className="border-b border-white/10 px-6 py-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Featured</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Predator pulley system, simplified
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/60">
                No dashboards, no stock counters—just a proven package that arrives with the parts,
                documentation, and support you need to keep customer cars moving.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 border-b border-white/10 px-6 py-6 sm:grid-cols-2">
              {SELLING_POINTS.map((card) => (
                <article
                  key={card.title}
                  className="rounded-xl border border-white/10 bg-black/20 p-5 shadow-[0_10px_40px_rgba(0,0,0,0.25)]"
                >
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-white/70">
                    {card.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-white/60">{card.body}</p>
                </article>
              ))}
            </div>

            <div className="flex flex-col gap-4 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="text-sm text-white/60">
                Have a build in queue?{' '}
                <span className="text-white">
                  Call{' '}
                  <a
                    href="tel:4076364341"
                    className="font-semibold text-primary transition hover:text-primary/80"
                  >
                    407-636-4341
                  </a>{' '}
                  or send your worksheet to{' '}
                  <a
                    href="mailto:sales@fasmotorsports.com"
                    className="font-semibold text-primary transition hover:text-primary/80"
                  >
                    sales@fasmotorsports.com
                  </a>
                  .
                </span>
              </div>
              <div className="flex flex-wrap gap-4">
                <a
                  href="/shop/storefront"
                  className="inline-flex items-center justify-center rounded-full border border-primary/70 px-5 py-2 text-sm font-semibold uppercase tracking-wide text-primary transition hover:border-primary hover:text-white"
                >
                  Shop predator kits
                </a>
                <a
                  href="/contact"
                  className="inline-flex items-center justify-center rounded-full border border-white/20 px-5 py-2 text-sm font-semibold uppercase tracking-wide text-white transition hover:border-primary hover:text-primary"
                >
                  Book an install consult
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
