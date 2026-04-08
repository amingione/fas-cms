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
    title: 'RAM TRX (Supercharged HEMI)',
    intro:
      'Stage-based power packages for the 6.2L supercharged TRX platform. Every build is installed, calibrated, and dyno-verified at our Punta Gorda, FL facility.',
    pkgs: [
      {
        label: 'FAS800 — 800 WHP',
        whp: '800 WHP',
        fuel: '91–93 Octane',
        useCase: 'Street / Daily Driver',
        components: [
          'Upper pulley kit with billet idler',
          'Upgraded spark plugs',
          'Performance thermostat',
          'Supercharger oil service',
          'Full custom dyno tune',
          'Installation labor — Punta Gorda, FL',
        ],
        price: 'Starting at $6,699 installed',
        href: '/packages/fas800',
      },
      {
        label: 'FAS850 — 850 WHP',
        whp: '850 WHP',
        fuel: '91–93 Octane',
        useCase: 'Street / Weekend',
        components: [
          'FAS800 foundation (pulley, plugs, thermostat)',
          'Upgraded fuel injectors',
          'Pinned crank assembly — required at 850 WHP and above',
          'Heat exchanger upgrade',
          'Full custom dyno tune',
        ],
        price: 'Starting at $7,499 installed',
        href: '/packages/fas850',
      },
      {
        label: 'FAS900 — 900 WHP',
        whp: '900 WHP',
        fuel: '91–93 Octane (E85 optional)',
        useCase: 'Street / High Performance',
        components: [
          'Aggressive pulley upgrade package',
          'Upgraded fuel injectors',
          'Pinned crank assembly',
          'Performance thermostat',
          'Full custom AWD dyno tune',
        ],
        price: '$9,999 installed',
        href: '/packages/fas900',
      },
      {
        label: 'FAS1000 — 1000+ WHP',
        whp: '1000+ WHP',
        fuel: 'E85 Required',
        useCase: 'Street / Strip',
        components: [
          'Race ported supercharger',
          '108mm throttle body',
          'Longtube headers with race midpipes',
          'Upgraded fuel system (injectors, pump, lines)',
          'E85 conversion and full custom dyno tune',
        ],
        price: 'Starting at $17,999 installed',
        href: '/packages/fas1000',
      },
      {
        label: 'FAS 1X — 1200–1500 HP',
        whp: '1200–1500 HP',
        fuel: 'E85 Required',
        useCase: 'Drag / Max Effort',
        components: [
          'FAS1000 foundation carried forward',
          'Platform-specific turbocharger (compound boost)',
          'Built bottom end — forged rods and pistons',
          'High-output fuel system for 1X power levels',
          'Race intercooling upgrade',
        ],
        price: 'Call for pricing — consultation required',
        href: '/packages/fas-1x',
      },
      {
        label: 'FAS 2X — 1600+ HP',
        whp: '1600+ HP',
        fuel: 'E85 + Methanol',
        useCase: 'Track / Record Builds',
        components: [
          'FAS 1X foundation plus second turbocharger',
          'CNC ported cylinder head package',
          'Dry sump lubrication system',
          'Methanol injection system',
          'Upgraded 8HP90 transmission internals',
        ],
        price: 'Call for pricing — consultation required',
        href: '/packages/fas-2x',
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

export default function TRXAccordian() {
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
