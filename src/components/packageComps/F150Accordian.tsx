import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

type Pkg = { label: string; desc: string };
type Section = { title: string; intro: string; pkgs: Pkg[]; disclaimer: string };

const sections: Section[] = [
  {
    title: 'Ford F-150 (2018+)',
    intro:
      'Turn-key twin-turbo systems for Gen 3–Gen 5 Coyote trucks. Every package is installed, calibrated, and verified in-house with datalogs and dyno proof.',
    pkgs: [
      {
        label: 'FAS 500+ Package — Street 600 WHP',
        desc: 'FAS-spec twin 54 mm turbo system with air-to-air intercooler, stainless hot/cold side plumbing, billet blow-off valves, upgraded low-side fuel pump, colder plugs, and HP Tuners calibration for 91/93 octane. Expect 550–620 whp with stock drivability and towing capability.'
      },
      {
        label: 'FAS 800 Package — Flex Fuel 800 WHP',
        desc: 'Upgraded 62 mm turbochargers, Fore Innovations dual-pump return fuel system, ID1050x injectors, boundary oil pump/gears, FAS heat exchanger, and flex-fuel tune with boost-by-gear control. Ideal for street/strip trucks targeting consistent 750–820 whp on E60–E85.'
      },
      {
        label: 'FAS 1000 Package — Race 1000+ WHP',
        desc: '64 mm turbos with billet compressor wheels, Fore triple-pump fuel system, ID1300x injectors, FAS billet intake manifold, long-tube headers with 3.5 in downpipes, dual catch can system, and dedicated E85 calibration. Supports 900–1050 whp with proven 10R80 clutch and valve body upgrades.'
      },
      {
        label: 'FAS 1X Package — 1200-1500 WHP',
        desc: 'Custom built short-block with forged pistons/rods, ARP head studs, 68 mm turbo upgrade, ice tank intercooler option, Fore quadruple pump fuel setup, and full motorsports wiring with standalone boost control. Tailored for customers wanting a competitive roll-race or no-prep build.'
      },
      {
        label: 'FAS 2X Package — 1600+ WHP',
        desc: 'Full race program featuring billet block solutions, 76 mm turbo options, dry sump, parachute-ready rear, carbon driveshaft, and complete chassis/traction setup. Built collaboratively to match class rules or personal ET targets.'
      }
    ],
    disclaimer:
      'Pricing listed covers turn-key installs with dyno validation. Built transmissions, upgraded driveline components, and additional safety equipment may be required at higher power levels. Modifying your vehicle can affect factory warranty coverage.'
  }
];

function PackageItem({ pkg }: { pkg: Pkg }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-white/15 first:border-t-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 md:px-5 py-3 flex items-center justify-between gap-4 text-left"
        aria-expanded={open}
      >
        <div>
          <div className="text-sm md:text-base font-medium text-white">{pkg.label}</div>
        </div>
        <motion.div
          animate={{ rotate: open ? 180 : 0, scale: open ? 1.05 : 1 }}
          transition={{ duration: 0.2 }}
          className="text-white/80"
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
            <div className="px-4 md:px-5 pb-4 pt-0 text-sm text-white/70">{pkg.desc}</div>
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
