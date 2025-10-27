import { motion } from 'framer-motion';
import {
  CheckIcon,
  CalendarDateRangeIcon,
  PencilIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline';

const steps = [
  {
    id: 1,
    icon: <CalendarDateRangeIcon className="w-6 h-6 text-white/70" />,
    title: 'Consult',
    desc: 'Define goals, constraints, budget, and intended use (street, track, work duty).'
  },
  {
    id: 2,
    icon: <PencilIcon className="w-6 h-6 text-white/70" />,
    title: 'Design',
    desc: 'On‑car measurement and CAD mock‑ups; choose materials, bends, joint types, and finish.'
  },
  {
    id: 3,
    icon: <WrenchScrewdriverIcon className="w-6 h-6 text-white/70" />,
    title: 'Fabricate',
    desc: 'Mandrel bending, precision TIG welds with back purge; fixtures for repeatability.'
  },
  {
    id: 4,
    icon: <CheckIcon className="w-6 h-6 text-white/70" />,
    title: 'Install & Tune',
    desc: 'Fitment check, leak‑test, and final finish.'
  }
];

export default function ProcessSection() {
  return (
    // Process
    <section className="py-20 px-6 border-t border-white/10 border-shadow drop-shadow-sm backdrop-blur-sm rounded-lg shadow-white/5">
      <div className="text-center mb-16">
        <h2 className="font-ethno text-4xl md:text-5xl font-bold">
          PROCESS <span className="text-white/60">IS EVERYTHING</span>
        </h2>
        <p className="mt-4 text-gray-400">Simple, streamlined process is what gets you results</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
        {steps.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.2 }}
            viewport={{ once: true }}
            className="bg-[#111] rounded-xl p-6 border border-white/10 shadow-card hover:border-red-600 transition flex flex-col items-start"
          >
            <div className="flex justify-between items-center mb-4">
              <span className="text-2xl">{s.icon}</span>
            </div>
            <h3 className="uppercase font-bold font-kwajong">{s.title}</h3>
            <p className="mt-3 text-sm text-gray-400 font-ethno">{s.desc}</p>
            <div className="mt-6 inline-flex items-center rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs tracking-wide text-gray-400 shadow-inner shadow-white/10">
              STEP {s.id}
            </div>
          </motion.div>
        ))}
      </div>
      {/* Footer */}
      <section className="py-12 px-6">
        <div className="text-center mt-20">
          <p className="text-sm tracking-wide text-white/70 font-mono font-bold">
            PRECISION ENGINEERING • CUSTOM FABRICATION • PERFORMANCE TUNING
          </p>
          <p className="text-accent font-ethno mt-2">
            — SOUTHWEST FLORIDA'S PREMIER PERFORMANCE SHOP —
          </p>
          <a
            className="inline-block mt-6 px-8 py-3 bg-[#0c0c0c] rounded-lg border font-ethno border-white/10 shadow-card hover:bg-red-600 transition"
            href="/contact"
          >
            GET STARTED →
          </a>
        </div>
      </section>
    </section>
  );
}
