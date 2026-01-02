import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

type Pkg = { label: string; desc: string };
type Section = { title: string; intro: string; pkgs: Pkg[]; disclaimer: string };

const sections: Section[] = [
  {
    title: 'RAM TRX (Supercharged HEMI)',
    intro:
      'Turn-key packages for the 6.2L TRX that balance brutal acceleration with reliable drivability. Every stage is installed, calibrated, and track-tested in-house by FAS.',
    pkgs: [
      {
        label: 'FAS 800 Package — 800+ HP',
        desc: 'FAS upper pulley kit, billet idler, upgraded spark plugs, 180° thermostat, fresh supercharger oil service, and custom engine/transmission calibration. Designed for 91/93 octane daily use with repeatable 10-second quarter-mile capability.'
      },
      {
        label: 'FAS 850 Package — 850+ HP',
        desc: 'Adds Predator lower pulley, HD belt system, heat exchanger upgrade, ID1050x injectors, flex-fuel sensor, and revised boost/shift mapping. Optimised for E40–E60 or race-gas blends while retaining street manners and towing capability.'
      },
      {
        label: 'FAS 900 Package — 900+ HP',
        desc: 'Port-matched supercharger snout, 108 mm throttle body, high-flow intake, CNC billet mid-pipes, dual catch can setup, and flex calibration for full E85. Includes transmission line pressure and torque management updates for consistent track passes.'
      },
      {
        label: 'FAS 1000 Package — 1000+ HP',
        desc: 'Full race-ported supercharger, long-tube headers with race mid-pipes, Fore dual pump return fuel system, ID1300x injectors, ice-tank capable intercooler system, and dedicated E85/VP tune. Built for 9-second capable TRX builds.'
      },
      {
        label: 'FAS 1X Package — 1200-1500 HP',
        desc: 'Custom short-block, camshaft and valvetrain upgrade, 3.0 upper/9.1 lower pulley combo, Fore triple pump fuel system, meth or nitrous optional. Includes drivetrain and safety recommendations tailored to the intended motorsport use.'
      },
      {
        label: 'FAS 2X Package — 1600+ HP',
        desc: 'Complete race programme: billet block, 3.2 upper/9.8 lower or alternative forced-induction route, dry sump, extreme fuel system, parachute-ready rear, and chassis setup. Consultation-driven build to hit record-setting ET and trap goals.'
      }
    ],
    disclaimer:
      'All packages include dyno verification and datalogs. Built transmissions, differential upgrades, and safety equipment may be required at higher power levels. Modifying your vehicle can impact factory warranty coverage.'
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
