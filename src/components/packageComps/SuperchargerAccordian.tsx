import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

type Pkg = { label: string; desc: string };
type Section = { title: string; intro: string; pkgs: Pkg[]; disclaimer: string };

const sections: Section[] = [
  {
    title: 'Hellcat / Trackhawk / Durango / TRX Superchargers',
    intro:
      'Porting packages for OEM 2.4L and 2.7L IHI units, billet lids, and snouts. Each blower is blueprinted, matched to the throttle body, and supplied with before/after documentation.',
    pkgs: [
      {
        label: '2.4L Street Port -- 20-30 WHP gain',
        desc: 'CNC rough-in and hand blend of inlet, bridge, and exit; snout match to 105 mm TB; case deburring and rotor timing verification. Ideal for pump-gas cars targeting 800-850 whp.'
      },
      {
        label: '2.4L Race Port -- 30-45 WHP gain',
        desc: 'Expanded cross-sectional area, vane biasing for high-RPM efficiency, optional bearing-plate smoothing, and 112 mm TB match. Best for flex-fuel builds in the 900-1000 whp range.'
      },
      {
        label: '2.7L Street Port -- 25-35 WHP gain',
        desc: 'Focus on inlet choke point, intercooler brick transition, and snout-to-case blend. Supports 1000+ whp combos with reduced IAT rise on long pulls.'
      },
      {
        label: '2.7L Race Port -- 40-55 WHP gain',
        desc: 'Aggressive case shaping, rotor trailing-edge relief, 118 mm throttle match, and lid flow-bench validation. Recommended for upper/lower pulley combos, nitrous, or twin pump E85 builds.'
      },
      {
        label: 'Billet Lid + Snout Match',
        desc: 'Port-match your FAS billet lid and snout to the ported case, ensuring seamless airflow and eliminating gasket lip turbulence. Includes hardware inspection and resurfacing.'
      }
    ],
    disclaimer:
      'All blowers are inspected, cleaned, and sealed prior to return. Core exchange options available. Customers are responsible for shipping both ways unless drop-off is scheduled.'
  },
  {
    title: 'Mustang GT / Shelby (Coyote) Superchargers',
    intro:
      'Stage-based porting for Gen 3-Gen 5 Coyotes running factory Eaton or aftermarket Whipple/TVS units. Optimised for strong mid-range torque with OEM drivability.',
    pkgs: [
      {
        label: 'Stage 1 -- OEM Eaton Blueprint',
        desc: 'Entry-level clean-up for Gen 3+ GT 5.0L Eatons: inlet transition smoothing, snout to elbow match, and exhaust vane deburring. Perfect for bolt-on 93 octane setups.'
      },
      {
        label: 'Stage 2 -- Eaton + Snout Port',
        desc: 'Extends Stage 1 with rotor pocket shaping, welded elbow reinforcement, and 132 mm throttle body match. Supports 750+ whp with proper fuel system and boost control.'
      },
      {
        label: 'Whipple 3.0 / 3.8 Port',
        desc: 'Inlet mouth enlargement, brick transition blending, and high-flow intercooler plate cleanup. Gains of 20-30 whp on E85 or race fuel; includes bypass valve calibration check.'
      },
      {
        label: 'TVS 2650 Competition Port',
        desc: 'Case and lid match, snout blueprint, and manifold alignment for VMP/Jokerz combos. Recommended for half-mile or roll-race builds targeting 900+ whp.'
      }
    ],
    disclaimer:
      'We offer removal and install at our facility or can receive shipped blowers. Turnaround is typically 7-10 business days; rush service available by appointment.'
  },
  {
    title: 'Audi 3.0T / 4.0T Supercharger Porting',
    intro:
      'CNC-programmed port work for Audi S4/S5/SQ5 (3.0T) and RS platforms. Packages focus on reducing IAT, improving rotor efficiency, and maintaining OEM refinement.',
    pkgs: [
      {
        label: 'Stage 1 -- 3.0T Charger Blueprint',
        desc: 'Disassembly, carbon cleaning, inlet bellmouth shaping, internal surface refinement, and rotor timing verification. +15-20 whp on pump gas dual pulley cars.'
      },
      {
        label: 'Stage 2 -- 3.0T + Snout Port',
        desc: 'Adds snout enlargement for larger pulleys, throttle body match, and bearing plate blend. Popular with dual pulley E40 builds seeking cooler IATs on extended pulls.'
      },
      {
        label: 'Stage 3 -- RS 4.0T Hybrid Prep',
        desc: 'Optimises the RS7/8V platform blower for upgraded turbos: inlet guide reshaping, intercooler brick smoothing, and meth/nozzle provisions. Includes flow report for tuner reference.'
      },
      {
        label: 'Optional Ancillary Services',
        desc: 'Ultrasonic cleaning, ceramic coating, CryO2 brick treatment, rotor pack rebuild, and media blasting of cases or snouts prior to coating.'
      }
    ],
    disclaimer:
      'Audi units require precise torque specs; we provide assembly notes and recommend professional install. Shipping crates available--contact us for scheduling and insurance guidance.'
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

export default function SuperchargerAccordion() {
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
