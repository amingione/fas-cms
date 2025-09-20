import { motion } from 'framer-motion';

const highlights = [
  {
    title: 'Premium Builds',
    description: 'Tailored performance packages engineered for your platform.',
  },
  {
    title: 'Rapid Turnaround',
    description: 'Streamlined scheduling keeps your vehicle on the road.',
  },
  {
    title: 'Expert Support',
    description: 'Talk directly with the builders behind every upgrade.',
  },
];

const containerVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 260, damping: 22 },
  },
};

export default function CTASection({
  eyebrow = 'Next-Level Performance',
  title = "Let's build the fastest version of your vehicle.",
  copy = 'From bolt-on upgrades to full custom fabrication, our team designs and installs packages that transform how you drive.',
  ctaLabel = 'Book a consult',
  ctaHref = '/appointments',
}) {
  return (
    <section className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black px-6 py-16 shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-pink-500/20 blur-3xl" aria-hidden="true" />
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={containerVariants}
        className="relative grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center"
      >
        <div className="space-y-6">
          <motion.p
            variants={itemVariants}
            className="inline-flex items-center rounded-full border border-white/20 bg-white/5 px-4 py-1 text-sm font-medium uppercase tracking-[0.2em] text-white/80"
          >
            {eyebrow}
          </motion.p>
          <motion.h2
            variants={itemVariants}
            className="text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-[2.75rem]"
          >
            {title}
          </motion.h2>
          <motion.p variants={itemVariants} className="max-w-xl text-lg leading-relaxed text-white/75">
            {copy}
          </motion.p>
          <motion.div variants={itemVariants}>
            <a
              href={ctaHref}
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-base font-semibold text-zinc-900 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {ctaLabel}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M7 7h10v10" />
              </svg>
            </a>
          </motion.div>
        </div>

        <motion.ul variants={itemVariants} className="grid gap-4">
          {highlights.map((item) => (
            <motion.li
              key={item.title}
              variants={itemVariants}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white shadow-inner shadow-white/10 backdrop-blur"
            >
              <h3 className="text-lg font-semibold text-white">{item.title}</h3>
              <p className="mt-2 text-sm text-white/70">{item.description}</p>
            </motion.li>
          ))}
        </motion.ul>
      </motion.div>
    </section>
  );
}
