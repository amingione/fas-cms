import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

type Pkg = {
  label: string;
  whp: string;
  fuel: string;
  useCase: string;
  components: string[];
  price: string;
  href: string;
};

type Section = { title: string; intro: string; pkgs: Pkg[]; disclaimer: string };

const sections: Section[] = [
  {
    title: 'Ford F-150 (2018+ EcoBoost 3.5L)',
    intro:
      'Turn-key twin-turbo packages for the Gen 3–Gen 5 EcoBoost 3.5L. Every package is installed, calibrated, and dyno-verified in-house at our Punta Gorda, FL facility.',
    pkgs: [
      {
        label: 'FAS500 — 600 WHP',
        whp: '600 WHP',
        fuel: '91–93 Octane',
        useCase: 'Street / Daily Driver',
        components: [
          'FAS-spec twin 54mm turbo system',
          'Air-to-air intercooler with stainless plumbing',
          'Billet blow-off valves',
          'Upgraded low-side fuel pump',
          'HP Tuners custom calibration — AWD dyno verified',
          'Installation labor — Punta Gorda, FL',
        ],
        price: '$7,499 installed',
        href: '/packages/fas500',
      },
      {
        label: 'FAS800 — 800 WHP',
        whp: '800 WHP',
        fuel: 'E40–E85',
        useCase: 'Street / Strip',
        components: [
          'Upgraded 62mm turbochargers',
          'Fore Innovations dual-pump return fuel system',
          'ID1050x fuel injectors',
          'FAS heat exchanger upgrade',
          'Flex-fuel tune with boost-by-gear control',
        ],
        price: 'Contact for pricing',
        href: '/packages/truckPackages',
      },
      {
        label: 'FAS1000 — 1000+ WHP',
        whp: '1000+ WHP',
        fuel: 'E85 Required',
        useCase: 'Race / High Performance',
        components: [
          '64mm turbos with billet compressor wheels',
          'Fore triple-pump fuel system',
          'ID1300x fuel injectors',
          'FAS billet intake manifold',
          'Long-tube headers with 3.5in downpipes',
          'Dedicated E85 calibration',
        ],
        price: 'Contact for pricing',
        href: '/contact',
      },
      {
        label: 'FAS 1X — 1200–1500 WHP',
        whp: '1200–1500 WHP',
        fuel: 'E85 Required',
        useCase: 'Drag / No-Prep',
        components: [
          'Custom short-block — forged pistons and rods, ARP studs',
          '68mm turbo upgrade',
          'Ice tank intercooler option',
          'Fore quadruple-pump fuel setup',
          'Standalone boost control and motorsports wiring',
        ],
        price: 'Call for pricing — consultation required',
        href: '/contact',
      },
      {
        label: 'FAS 2X — 1600+ WHP',
        whp: '1600+ WHP',
        fuel: 'E85 + Methanol',
        useCase: 'Track / Record Builds',
        components: [
          'Billet block solution',
          '76mm turbo option',
          'Dry sump lubrication',
          'Carbon driveshaft',
          'Full chassis and traction setup',
        ],
        price: 'Call for pricing — consultation required',
        href: '/contact',
      },
    ],
    disclaimer:
      'MODIFYING YOUR VEHICLE COULD LEAD TO THE LOSS OF YOUR FACTORY WARRANTY. FAS is not responsible for any issues you may encounter with dealership warranty claims.',
  },
];

function PackageItem({ pkg }: { pkg: Pkg }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-white/15 first:border-t-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 md:px-5 py-3 flex items-center justify-between gap-4 text-left cursor-pointer"
        aria-expanded={open}
      >
        <div>
          <div className="text-sm md:text-base font-medium text-white">{pkg.label}</div>
          {!open && (
            <div className="text-xs text-white/50 mt-0.5">{pkg.fuel} · {pkg.price}</div>
          )}
        </div>
        <motion.div
          animate={{ rotate: open ? 180 : 0, scale: open ? 1.05 : 1 }}
          transition={{ duration: 0.2 }}
          className="text-white/80 flex-shrink-0"
        >
          <ChevronDown className="h-4 w-4" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ height: { duration: 0.3 }, opacity: { duration: 0.2 } }}
          >
            <div className="px-4 md:px-5 pb-4 pt-1 space-y-3">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white/80">{pkg.whp}</span>
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white/80">{pkg.fuel}</span>
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white/80">{pkg.useCase}</span>
              </div>
              <ul className="space-y-1">
                {pkg.components.map((c) => (
                  <li key={c} className="flex items-start gap-1.5 text-xs text-white/60">
                    <span className="mt-0.5 flex-shrink-0 text-white/30">—</span>{c}
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between pt-1 border-t border-white/10">
                <span className="text-sm font-semibold text-white">{pkg.price}</span>
                <a
                  href={pkg.href}
                  className="inline-flex items-center gap-1 text-sm font-medium text-red-400 hover:text-red-300 transition-colors"
                >
                  View Full Build →
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PlatformBlock({ section }: { section: Section }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className=""
    >
      <div className="mb-2">
        <h3 className="text-lg md:text-xl font-cyber tracking-widest text-white">
          {section.title}
        </h3>
        <p className="mt-1 text-xs md:text-sm text-white/70">{section.intro}</p>
      </div>
      <div className="divide-y divide-white/15">
        {section.pkgs.map((pkg) => (
          <PackageItem key={`${section.title}-${pkg.label}`} pkg={pkg} />
        ))}
      </div>
      <p className="mt-3 text-[11px] text-white/60">{section.disclaimer}</p>
    </motion.div>
  );
}

export default function F150Accordian() {
  return (
    <section className="py-10 md:py-14">
      <div className="mx-auto w-full max-w-5xl px-4 md:px-0">
        <div className="max-w-3xl mx-auto text-center mb-6 md:mb-10">
          <h3 className="text-2xl md:text-3xl font-ethno text-accent tracking-wide">
            Platform Packages Overview
          </h3>
        </div>
        <div className="space-y-8 md:space-y-10">
          {sections.map((s) => (
            <PlatformBlock key={s.title} section={s} />
          ))}
        </div>
      </div>
    </section>
  );
}
