import { Badge } from './ui/badge';
import Button from '@/components/button';
import { CheckCircle, ArrowRight, Shield, Trophy, Zap, Users } from 'lucide-react';
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

const stats = [
  { value: '2000+', label: 'HP BUILDS', icon: Zap },
  { value: '20+', label: 'YEARS', icon: Trophy },
  { value: '500+', label: 'CLIENTS', icon: Users },
  { value: '100%', label: 'QUALITY', icon: Shield }
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
                <span className="block text-green-500 font-captain text-2xl md:text-3xl lg:text-4xl">
                  SUPERIOR
                </span>
              </motion.h2>

              <motion.p
                className="text-sm md:text-base lg:text-lg text-graylight leading-relaxed font-kwajong"
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
                  <span className="text-xs md:text-sm text-graylight group-hover:text-white transition-colors duration-300 font-medium font-kwajong leading-relaxed">
                    {achievement}
                  </span>
                </motion.div>
              ))}
            </motion.div>

            {/* Stats Grid - Mobile Friendly */}
            <motion.div
              className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 pt-4 md:pt-6"
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 1.6, duration: 0.6 }}
            >
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <motion.div
                    key={stat.label}
                    className="bg-gradient-to-br from-primary/20 to-red-600/20 rounded-lg p-3 md:p-4 text-center border border-primary/20 industrial-glow"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={isInView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ delay: 1.8 + index * 0.1, duration: 0.4 }}
                    whileHover={{ scale: 1.05 }}
                  >
                    <Icon className="w-4 h-4 md:w-5 md:h-5 text-primary mx-auto mb-1 md:mb-2" />
                    <div className="text-lg md:text-xl font-black text-white font-borg">
                      {stat.value}
                    </div>
                    <div className="text-xs md:text-sm text-graylight font-bold font-ethno">
                      {stat.label}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>

            {/* CTA Button */}
            <motion.div
              className="pt-4 md:pt-6"
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 2.2, duration: 0.6 }}
            >
              <Button
                size="lg"
                className="group bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg shadow-green-500/25 px-6 md:px-8 py-3 md:py-4 text-sm md:text-base font-bold metallic-btn font-ethno w-full md:w-auto"
                href="#"
                text="OUR STORY"
                onClick={() => {
                  /* handle click here if needed */
                }}
              >
                OUR STORY
                <motion.div
                  className="ml-2"
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                ></motion.div>
              </Button>
            </motion.div>
          </motion.div>

          {/* Image Gallery - Mobile Optimized */}
          <motion.div
            className="relative mt-8 lg:mt-0"
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={isInView ? { opacity: 1, x: 0, scale: 1 } : {}}
            transition={{ delay: 0.6, duration: 1, ease: 'easeOut' }}
          >
            {/* Mobile Layout - Single Column */}
            <div className="block md:hidden space-y-4">
              <motion.div
                className="relative rounded-2xl overflow-hidden shadow-2xl industrial-glow"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                <img
                  src="/images/FAS Pulley & Hub Kit.png"
                  alt="Precision Billet Work"
                  className="w-full h-48 object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                <div className="absolute bottom-3 left-3 text-white font-bold text-sm font-ethno">
                  PRECISION MACHINING
                </div>
              </motion.div>

              <motion.div
                className="relative rounded-2xl overflow-hidden shadow-2xl industrial-glow"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                <img
                  src="/images/billet bearing plate.png"
                  alt="F.A.S. Components"
                  className="w-full h-48 object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                <div className="absolute bottom-3 left-3 text-white font-bold text-sm font-ethno">
                  F.A.S. COMPONENTS
                </div>
              </motion.div>
            </div>

            {/* Desktop Layout - Grid */}
            <div className="hidden md:grid grid-cols-2 gap-4 lg:gap-6">
              <div className="space-y-4 lg:space-y-6">
                <motion.div
                  className="relative rounded-2xl overflow-hidden shadow-2xl group industrial-glow"
                  whileHover={{ scale: 1.05, rotateY: 5 }}
                  transition={{ duration: 0.5 }}
                  style={{ perspective: '1000px' }}
                >
                  <img
                    src="/images/FAS-Billet-Snout-Front.png"
                    alt="Precision Billet Work"
                    className="w-full h-48 lg:h-64 object-cover group-hover:scale-110 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="absolute bottom-4 left-4 text-white font-bold text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-ethno">
                    PRECISION MACHINING
                  </div>
                </motion.div>

                <motion.div
                  className="relative rounded-2xl overflow-hidden shadow-2xl group industrial-glow"
                  whileHover={{ scale: 1.05, rotateY: -5 }}
                  transition={{ duration: 0.5 }}
                  style={{ perspective: '1000px' }}
                >
                  <img
                    src="/images/FAS Pulley & Hub Kit.png"
                    alt="Billet Aluminum Components"
                    className="w-full h-32 lg:h-40 object-cover group-hover:scale-110 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="absolute bottom-4 left-4 text-white font-bold text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-ethno">
                    F.A.S. COMPONENTS
                  </div>
                </motion.div>
              </div>

              <div className="space-y-4 lg:space-y-6 pt-8 lg:pt-12">
                <motion.div
                  className="relative rounded-2xl overflow-hidden shadow-2xl group industrial-glow"
                  whileHover={{ scale: 1.05, rotateY: 5 }}
                  transition={{ duration: 0.5 }}
                  style={{ perspective: '1000px' }}
                >
                  <img
                    src="/images/FAS-Team-Testing-Day.png"
                    alt="Racing Application"
                    className="w-full h-32 lg:h-40 object-cover group-hover:scale-110 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="absolute bottom-4 left-4 text-white font-bold text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-ethno">
                    RACING HERITAGE
                  </div>
                </motion.div>

                <motion.div
                  className="relative rounded-2xl overflow-hidden shadow-2xl group industrial-glow"
                  whileHover={{ scale: 1.05, rotateY: -5 }}
                  transition={{ duration: 0.5 }}
                  style={{ perspective: '1000px' }}
                >
                  <img
                    src="/images/fas pred pully HP{ copy.png"
                    alt="Quality Control"
                    className="w-full h-48 lg:h-64 object-cover group-hover:scale-110 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="absolute bottom-4 left-4 text-white font-bold text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-ethno">
                    SUPERIOR QUALITY
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Subtle glow effects - Desktop only */}
            <div className="hidden lg:block absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-green-500/20 to-blue-500/20 rounded-full blur-3xl"></div>
            <div className="hidden lg:block absolute -bottom-4 -left-4 w-20 h-20 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-full blur-2xl"></div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
