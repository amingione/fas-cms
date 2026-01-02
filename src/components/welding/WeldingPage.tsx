'use client';

import { motion } from 'framer-motion';
import BrandDivider from '../divider/brandDivider';
import SocialMedia from '../divider/socialMedia';

const easeOut = [0.16, 1, 0.3, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  show: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay, duration: 0.6, ease: easeOut }
  })
};
const projects = [
  'https://framerusercontent.com/images/iZXow8fbJI7uHxw4lnehA9k9dY.png',
  'https://framerusercontent.com/images/VMpH1u4xBoFeNT64AG87jI6bk.png'
];

const capabilities = [
  'Quality & Standards',
  'Exhaust Systems',
  'Tig Welds',
  'Mid Pipes',
  'Cats',
  'Custom Fabrication'
];

export default function WeldingPage() {
  return (
    <div className="bg-dark text-white font-sans">
      {/* Hero */}
      <section className="relative h-screen flex items-center justify-start">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-50"
          src="https://videos.pexels.com/video-files/9694443/9694443-hd_1920_1080_25fps.mp4"
        />
        <motion.div
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="relative z-10 max-w-3xl px-6 text-left flex flex-col items-start"
        >
          <BrandDivider className="justify-start" />
          <h1 className="text-5xl md:text-7xl font-ethno text-white">
            Demand <span className="text-white/30">More</span>
          </h1>
          <p className="mt-6 text-lg opacity-80 font-mono font-bold">
            From pipes to full exhausts, we craft performance parts with zero compromises.
          </p>
          <div className="mt-8 flex justify-start gap-4">
            <a
              href="/contact"
              className="px-6 py-3 rounded-lg bg-white/10 hover:bg-white/20 transition"
            >
              Get Started
            </a>
            <a
              href="/contact"
              className="hidden px-6 py-3 rounded-lg bg-red-600 hover:bg-red-700 transition"
            >
              Get Started
            </a>
          </div>
        </motion.div>
      </section>

      {/* About Section */}
      <section className="py-10 mt-5 px-6 max-w-6xl mx-auto border-t shadow-inner border-rounded rounded-lg border-white/10 shadow-white/10">
        <div className="text-center mb-12">
          <h2 className="font-ethno text-4xl md:text-5xl font-bold">
            DREAM IT, <span className="text-white/70">BUILD IT.</span>
          </h2>
        </div>

        <div className="mx-auto max-w-md rounded-xl overflow-hidden shadow-card border border-white/10">
          <img
            src="https://framerusercontent.com/images/P8jmf5btBefSTVQXSJBjBPwU.png"
            alt="Weld"
            className="w-full object-cover"
          />
        </div>

        <div className="mt-8 text-center">
          <h3 className="font-ethno text-xl">WE CRAFT YOUR VISION</h3>
          <p className="mt-4 text-gray-400 max-w-2xl mx-auto">
            From bold concepts to flawless execution, we build performance masterpieces tailored to
            you.
          </p>

          <section className="flex justify-center mt-6">
            <SocialMedia />
          </section>
        </div>
      </section>

      {/* Capabilities */}
      <section className="py-16 bg-[#080808] border-t border-rounded rounded-md border-white/10 mt-16">
        <div className="text-center mb-12">
          <h2 className="font-ethno text-3xl md:text-5xl">
            OUR <span className="text-white/60">CAPABILITIES</span>
          </h2>
          <p className="mt-4 text-white/30 max-w-2xl mx-auto font-mono">
            Precision craftsmanship meets cutting-edge technology. Our welding facility is equipped
            to handle projects of all sizes and complexities.
          </p>
        </div>
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap gap-4 justify-center">
          {capabilities.map((c) => (
            <span
              key={c}
              className="px-4 py-2 bg-[#111] rounded-lg text-sm border shadow-inner shadow-white/30 font-mono border-white/10"
            >
              {c}
            </span>
          ))}
        </div>
      </section>

      {/* Projects */}
      <section
        className="py-24 bg-transparent border-t border-rounded rounded-lg border-white/10 shadow-inner shadow-white/10"
        id="projects"
      >
        <div className="max-w-6xl mx-auto px-6">
          <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-transparent border-t shadow-white/20 border-white/10 mb-6">
            <span className="text-white font-bold font-borg italic">Custom </span>
            <span className="font-semibold font-ethno text-primary italic">Welding</span>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {projects.map((p, idx) => (
              <motion.div
                key={idx}
                whileHover={{ scale: 1.03 }}
                className="rounded-xl overflow-hidden shadow-card border border-white/10 relative"
              >
                <img
                  src={p}
                  alt="Project"
                  className="border shadow-card border-white/10 bg-gray w-full h-full object-cover"
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Packages */}
      <section className="border-t border-shadow shadow-inner border-rounded shadow-white/10 rounded-lg py-24 px-6 max-w-6xl mx-auto flex flex-col lg:flex-row gap-12 items-center">
        <div className="flex-1">
          <h2 className="font-ethno text-4xl md:text-5xl font-bold">
            LET’S GROW <span className="text-white/70">TOGETHER</span>
          </h2>

          <div className="section-divider w-full border-t border-white/10 my-8"></div>

          <div className="mt-8">
            <h3 className="uppercase text-sm font-ethno italic text-gray-300">
              Power Packages{' '}
              <span className="ml-2 bg-transparent border border-rounded rounded-md shadow-inner shadow-gray-700 text-accent px-2 py-1 text-xs font-mono">
                Starting from $1,399
              </span>
            </h3>
            <p className="text-gray-400 mt-2 font-mono">
              Platform-tuned upgrade bundles engineered for clean installs, real gains, and
              factory-like drivability.
            </p>
          </div>

          <div className="section-divider w-full border-t border-white/10 my-8"></div>

          <div className="mt-8">
            <h3 className="uppercase text-sm font-ethno italic text-gray-300">
              Truck Packages{' '}
              <span className="ml-2 bg-transparent border border-rounded rounded-md shadow-inner shadow-gray-700 text-accent px-2 py-1 text-xs font-mono">
                Starting from $6,699
              </span>
            </h3>
            <p className="text-gray-400 mt-2 font-mono">
              Platform-tuned upgrade bundles engineered for clean installs, real gains, and
              factory-like drivability.
            </p>
          </div>

          <a className="btn-glass inline-block mt-10 px-8 py-3 bg-[#0c0c0c] rounded-lg border border-white/10 shadow-card hover:bg-red-600 transition">
            SEE ALL →
          </a>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="flex-1"
        >
          <section className="relative aspect-[4/3] mb-6 inline-flex items-center gap-2 px-4 py-2 border-t border-shadow shadow-inner shadow-white/10 inset-0 rounded-lg bg-gradient-to-br from-[#080808] to-[#000000]">
            <div className="relative inline-flex aspect-[4/3] rounded-xl overflow-hidden inset-2 shadow-black/50 drop-shadow shadow-inner bg-[#00000019]">
              <img
                src="/images/packages/Hellcat/FAS-9.webp"
                alt="1000 Package Charger"
                className="w-full object-cover"
              />
            </div>
          </section>
        </motion.div>
      </section>
    </div>
  );
}
