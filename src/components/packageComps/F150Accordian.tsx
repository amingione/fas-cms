import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type Pkg = { label: string; desc: string };
type Section = { title: string; intro: string; pkgs: Pkg[]; disclaimer: string };

const sections: Section[] = [
  {
    title: 'F150 Platform',
    intro:
      'Here at FAS Motorsports, we have built and modified countless F150 Vehicles which has allowed us to assemble the best packages possible!',
    pkgs: [
      {
        label: 'FAS800',
        desc: 'FAS Upper Pulley Kit, Spark Plugs, 180 Thermostat, Custom 1320Tunez engine and trans tune'
      },
      {
        label: 'FAS850',
        desc: 'FAS Upper Pulley Kit, Predator Lower Pulley, Upgraded Injectors, Custom 1320Tunez engine and trans tune and much more!'
      },
      {
        label: 'FAS900',
        desc: 'Race Ported Supercharger snout, 108mm throttle body, High flow intake, Race Midpipes, FAS Upper Pulley Kit, Predator Lower Pulley, Upgraded Injectors, Custom 1320Tunez engine and trans tune and much more! (E85 Fuel Package)'
      },
      {
        label: 'FAS1000',
        desc: 'Race Ported Supercharger, 108mm throttle body, High flow intake, Longtube headers with Race Midpipes, FAS Upper Pulley Kit, Predator Lower Pulley, Upgraded Injectors, E85, Custom 1320Tunez engine and trans tune and much more! (E85 Fuel Package)'
      },
      {
        label: 'FAS 1X Package',
        desc: '1200-1500HP!!! Call and discuss many potential options for this package!'
      },
      {
        label: 'FAS 2X Package',
        desc: '1600+HP!!! Call and discuss many potential options for this package!'
      }
    ],
    disclaimer:
      'MODIFYING YOUR VEHICLE COULD LEAD TO THE LOSS OF YOUR FACTORY WARRANTY! FAS is not responsible for any issues you may encounter with your dealership warranty claims or warrantied issues/repairs.'
  }
];

function PackageItem({ pkg, index }: { pkg: Pkg; index: number }) {
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
        {section.pkgs.map((pkg, idx) => (
          <PackageItem key={`${section.title}-${pkg.label}`} pkg={pkg} index={idx} />
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
