import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

type Pkg = {
  label: string;
  gain: string;
  fuel: string;
  targetBuild: string;
  includes: string[];
  price: string;
  href: string;
};

type Section = { title: string; intro: string; pkgs: Pkg[]; disclaimer: string };

const sections: Section[] = [
  {
    title: 'Hellcat / Trackhawk / Durango / TRX',
    intro:
      'CNC and hand-ported OEM 2.4L and 2.7L IHI units for the Hellcat supercharged platform. Each blower is blueprinted, matched to the throttle body, and returned with before/after documentation.',
    pkgs: [
      {
        label: '2.4L Street Port — 20–30 WHP Gain',
        gain: '20–30 WHP Gain',
        fuel: '91–93 Octane',
        targetBuild: '800–850 WHP Builds',
        includes: [
          'CNC rough-in and hand blend of inlet, bridge, and exit',
          'Snout match to 105mm throttle body',
          'Case deburring and rotor timing verification',
          'Before/after documentation included',
        ],
        price: 'Contact for quote',
        href: '/hellcat-supercharger-porting',
      },
      {
        label: '2.4L Race Port — 30–45 WHP Gain',
        gain: '30–45 WHP Gain',
        fuel: 'E85 / Flex Fuel',
        targetBuild: '900–1000 WHP Builds',
        includes: [
          'Expanded cross-sectional area',
          'Vane biasing for high-RPM efficiency',
          'Optional bearing-plate smoothing',
          '112mm throttle body match',
        ],
        price: 'Contact for quote',
        href: '/hellcat-supercharger-porting',
      },
      {
        label: '2.7L Street Port — 25–35 WHP Gain',
        gain: '25–35 WHP Gain',
        fuel: '91–93 Octane / E85',
        targetBuild: '1000+ WHP Builds',
        includes: [
          'Inlet choke point and intercooler brick transition work',
          'Snout-to-case blend',
          'Reduced IAT rise on extended pulls',
          'Before/after documentation included',
        ],
        price: 'Contact for quote',
        href: '/hellcat-supercharger-porting',
      },
      {
        label: '2.7L Race Port — 40–55 WHP Gain',
        gain: '40–55 WHP Gain',
        fuel: 'E85 / Methanol',
        targetBuild: 'Twin-Charged / 1200+ HP Builds',
        includes: [
          'Aggressive case shaping',
          'Rotor trailing-edge relief',
          '118mm throttle match',
          'Lid flow-bench validation',
        ],
        price: 'Contact for quote',
        href: '/hellcat-supercharger-porting',
      },
      {
        label: 'Billet Lid + Snout Match',
        gain: 'Flow Optimization',
        fuel: 'All Fuel Types',
        targetBuild: 'Any Ported Build',
        includes: [
          'Port-match billet lid and snout to ported case',
          'Eliminates gasket lip turbulence',
          'Hardware inspection and resurfacing',
          'Compatible with all FAS port packages',
        ],
        price: 'Contact for quote',
        href: '/hellcat-supercharger-porting',
      },
    ],
    disclaimer:
      'All blowers are inspected, cleaned, and sealed prior to return. Core exchange options available. Customers are responsible for shipping both ways unless drop-off is scheduled.',
  },
  {
    title: 'Mustang GT / Shelby (Coyote)',
    intro:
      'Stage-based porting for Gen 3–Gen 5 Coyotes running factory Eaton or aftermarket Whipple/TVS units. Optimized for strong mid-range torque with OEM drivability.',
    pkgs: [
      {
        label: 'Stage 1 — OEM Eaton Blueprint',
        gain: 'Entry-Level Gains',
        fuel: '91–93 Octane',
        targetBuild: 'Bolt-On 5.0L GT Builds',
        includes: [
          'Inlet transition smoothing',
          'Snout to elbow match',
          'Exhaust vane deburring',
          'Ideal for Gen 3+ GT 5.0L Eatons',
        ],
        price: 'Contact for quote',
        href: '/contact',
      },
      {
        label: 'Stage 2 — Eaton + Snout Port',
        gain: '750+ WHP Capable',
        fuel: '91–93 Octane / E85',
        targetBuild: '750+ WHP Builds',
        includes: [
          'Stage 1 scope carried forward',
          'Rotor pocket shaping',
          'Welded elbow reinforcement',
          '132mm throttle body match',
        ],
        price: 'Contact for quote',
        href: '/contact',
      },
      {
        label: 'Whipple 3.0 / 3.8 Port',
        gain: '20–30 WHP Gain',
        fuel: 'E85 / Race Fuel',
        targetBuild: 'Whipple-Equipped Builds',
        includes: [
          'Inlet mouth enlargement',
          'Brick transition blending',
          'High-flow intercooler plate cleanup',
          'Bypass valve calibration check',
        ],
        price: 'Contact for quote',
        href: '/contact',
      },
      {
        label: 'TVS 2650 Competition Port',
        gain: '900+ WHP Capable',
        fuel: 'E85 / Race Fuel',
        targetBuild: 'Half-Mile / Roll-Race Builds',
        includes: [
          'Case and lid match',
          'Snout blueprint',
          'Manifold alignment for VMP/Jokerz combos',
          'Recommended for 900+ WHP targets',
        ],
        price: 'Contact for quote',
        href: '/contact',
      },
    ],
    disclaimer:
      'We offer removal and install at our facility or can receive shipped blowers. Turnaround is typically 7–10 business days; rush service available by appointment.',
  },
  {
    title: 'Audi 3.0T / 4.0T Supercharger Porting',
    intro:
      'CNC-programmed port work for Audi S4/S5/SQ5 (3.0T) and RS platforms. Focused on reducing IAT, improving rotor efficiency, and maintaining OEM refinement.',
    pkgs: [
      {
        label: 'Stage 1 — 3.0T Charger Blueprint',
        gain: '15–20 WHP Gain',
        fuel: '91–93 Octane',
        targetBuild: 'Dual Pulley 3.0T Builds',
        includes: [
          'Disassembly and carbon cleaning',
          'Inlet bellmouth shaping',
          'Internal surface refinement',
          'Rotor timing verification',
        ],
        price: 'Contact for quote',
        href: '/contact',
      },
      {
        label: 'Stage 2 — 3.0T + Snout Port',
        gain: 'Cooler IATs on E40 Builds',
        fuel: 'E40 / E85',
        targetBuild: 'Dual Pulley E40 Builds',
        includes: [
          'Stage 1 scope carried forward',
          'Snout enlargement for larger pulleys',
          'Throttle body match',
          'Bearing plate blend',
        ],
        price: 'Contact for quote',
        href: '/contact',
      },
      {
        label: 'Stage 3 — RS 4.0T Hybrid Prep',
        gain: 'Optimized for Upgraded Turbos',
        fuel: 'E85 / Meth',
        targetBuild: 'RS7 / 8V Hybrid Builds',
        includes: [
          'Inlet guide reshaping for upgraded turbos',
          'Intercooler brick smoothing',
          'Methanol/nozzle provisions',
          'Flow report for tuner reference',
        ],
        price: 'Contact for quote',
        href: '/contact',
      },
      {
        label: 'Optional Ancillary Services',
        gain: 'Build Support',
        fuel: 'All Platforms',
        targetBuild: 'Any Blower Build',
        includes: [
          'Ultrasonic cleaning',
          'Ceramic coating',
          'CryO2 brick treatment',
          'Rotor pack rebuild',
          'Media blasting of cases or snouts',
        ],
        price: 'Contact for quote',
        href: '/contact',
      },
    ],
    disclaimer:
      'Audi units require precise torque specs; we provide assembly notes and recommend professional install. Shipping crates available — contact us for scheduling and insurance guidance.',
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
            <div className="text-xs text-white/50 mt-0.5">{pkg.targetBuild} · {pkg.price}</div>
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
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white/80">{pkg.gain}</span>
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white/80">{pkg.fuel}</span>
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white/80">{pkg.targetBuild}</span>
              </div>
              <ul className="space-y-1">
                {pkg.includes.map((c) => (
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
                  Request Service →
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
