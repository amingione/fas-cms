import { Badge } from './ui/badge';
import { CheckCircle } from 'lucide-react';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

const achievements = [
  'Full-Service Performance Shop',
  'Precision-machined billet aluminum components',
  'Custom In-House fabrication',
  'Trusted by Enthusiasts Nationwide',
  'Specialists in High-Performance Builds',
  'Founded by enthusiasts - Driven by a genuine love for speed, precision, and pushing the limits'
];

export function About() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <section ref={ref} className="relative py-8 md:py-16 lg:py-20 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 asphalt-texture">
        <div className="absolute inset-0 bg-gradient-to-br from-black/95 via-gray-900/85 to-black/95"></div>
        <div className="absolute inset-0 grunge-overlay"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 md:px-6">
        <div className="grid lg:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center">
          {/* Content Section */}
          <motion.div
            className="space-y-6 md:space-y-8"
            initial={{ opacity: 0, x: -100 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <div className="space-y-4 md:space-y-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                <Badge
                  variant="outline"
                  className="mb-3 md:mb-4 bg-green-500/10 border-green-500/30 text-green-400 px-4 md:px-6 py-1 md:py-2 text-xs md:text-sm font-bold tracking-widest font-borg"
                >
                  F.a.S. HERITAGE
                </Badge>
              </motion.div>

              <motion.h2
                className="leading-tight"
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.4, duration: 0.8 }}
              >
                <span className="block text-white font-cyber text-2xl md:text-3xl lg:text-4xl">
                  FAST
                </span>
                <span className="block font-borg text-3xl md:text-4xl lg:text-5xl">AGGRESSIVE</span>
                <span className="block text-green-500 font-mono text-2xl md:text-3xl lg:text-4xl">
                  SUPERIOR
                </span>
              </motion.h2>

              <motion.p
                className="text-sm md:text-base lg:text-lg text-white/60 leading-relaxed font-kwajong"
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.6, duration: 0.6 }}
              >
                Founded on the core principles of Fast, Aggressive, and Superior performance, F.A.S.
                Motorsports has been the driving force behind championship-winning supercharger
                technology for over two decades.
              </motion.p>

              <motion.div
                className="font-borg text-accent text-xs md:text-sm tracking-widest"
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 1 } : {}}
                transition={{ delay: 0.8, duration: 0.6 }}
              >
                — CHAMPIONSHIP HERITAGE SINCE 2000 —
              </motion.div>
            </div>

            {/* Achievements List - Mobile Optimized */}
            <motion.div
              className="space-y-2 md:space-y-3"
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.8, duration: 0.6 }}
            >
              {achievements.map((achievement, index) => (
                <motion.div
                  key={index}
                  className="flex items-start space-x-3 group"
                  initial={{ opacity: 0, x: -30 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 1 + index * 0.1, duration: 0.4 }}
                >
                  <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-400 mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform duration-300" />
                  <span className="text-xs md:text-sm text-white/60 group-hover:text-white transition-colors duration-300 font-medium font-kwajong leading-relaxed">
                    {achievement}
                  </span>
                </motion.div>
              ))}
            </motion.div>

            {/* CTA Button */}
            <motion.div
              className="pt-4 md:pt-6"
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 2.2, duration: 0.6 }}
            ></motion.div>
          </motion.div>
          {/* End content column */}
          {/* Removed gallery column */}
        </div>
      </div>
    </section>
  );
}

export default About;
