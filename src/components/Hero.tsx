import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Zap, Shield, Wrench } from 'lucide-react';
import { motion } from 'framer-motion';

export function Hero() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 640);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return (
    <section
      id="home"
      className="border-t shadow-inner shadow-white/20 rounded-md py-5 px-5 relative flex items-center justify-center"
    >
      {/* Background Effects */}
      <div className="absolute inset-0"></div>

      {/* Racing stripes */}
      <div className="absolute inset-0 racing-stripe opacity-20"></div>

      {/* Animated performance indicators */}
      <div className="absolute inset-0">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              left: `${5 + i * 8}%`,
              top: `${10 + (i % 4) * 25}%`,
              width: '1px',
              height: '40px'
            }}
            animate={{
              opacity: [0.2, 0.8, 0.2],
              scaleY: [0.5, 1.2, 0.5]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.2,
              ease: 'easeInOut'
            }}
          >
            <div className="w-full h-full bg-gradient-to-b from-charcoal/20 via-primary/30 to-transparent"></div>
          </motion.div>
        ))}
      </div>

      <div className="container mx-auto px-4 md:px-6 mb-10 relative z-10">
        <div className="relative flex-auto items-center justify-items-center">
          {/* Content Section */}
          <motion.div
            className="space-y-6 lg:space-y-8 max-w-3xl mx-auto text-center"
            initial={false}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, ease: 'easeOut' }}
          >
            {/* Main Title */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 1 }}
              className="space-y-2 pt-5"
            >
              <h1 className="font-black justify-items-start leading-tight tracking-tight font-ethno">
                <span className="block font-borg italic justify-start text-white text-3xl sm:text-4xl lg:text-6xl xl:text-7xl">
                  F.a.S.
                </span>
                <span className="justify-start block italic text-primary font-ethno text-base sm:text-base lg:text-3xl xl:text-4xl">
                  MOTORSPORTS
                </span>
              </h1>

              <motion.p
                className="text-sm sm:text-base lg:text-lg xl:text-xl justify-center text-secondary font-light tracking-wide font-kwajong"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.8 }}
              >
                PRECISION ENGINEERING • CUSTOM FABRICATION • PERFORMANCE TUNING
              </motion.p>

              <motion.div
                className="text-xs justify-center sm:text-sm text-accent font-borg tracking-widest"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.1, duration: 0.8 }}
              >
                — SOUTHWEST FLORIDA'S PREMIER PERFORMANCE SHOP —
              </motion.div>
            </motion.div>

            {/* Feature Icons */}
            <motion.div
              className="flex justify-center items-center space-x-6 lg:space-x-8"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.3, duration: 0.8 }}
            >
              {[
                { icon: Zap, label: 'POWER', color: 'text-primary' },
                { icon: Wrench, label: 'PRECISION', color: 'text-accent' },
                { icon: Shield, label: 'RELIABILITY', color: 'text-secondary' }
              ].map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={index}
                    className="text-center justify-center group cursor-pointer"
                    whileHover={{ scale: 1.1, y: -5 }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.5 + index * 0.2, duration: 0.6 }}
                  >
                    <div
                      className={`w-14 h-14 lg:w-16 lg:h-16 bg-black/50 rounded-2xl flex items-center justify-center mx-auto mb-2 group-hover:shadow-xl transition-all duration-300 border border-gray-700/50 industrial-card`}
                    >
                      <Icon
                        className={`w-6 h-6 lg:w-8 lg:h-8 ${item.color} group-hover:scale-110 transition-transform duration-300`}
                      />
                    </div>
                    <div
                      className={`text-xs lg:text-sm font-bold ${item.color} font-ethno tracking-wider`}
                    >
                      {item.label}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>

            {/* Call to Action */}
            <motion.div
              className="space-y-4 justify-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.8, duration: 0.8 }}
            >
              <div className="relative w-full flex flex-col sm:flex-row gap-3 justify-center items-center">
                <motion.div whileTap={{ scale: 0.98 }}>
                  <Button
                    size={isMobile ? 'xs' : 'xs'}
                    className="w-full mt-2 sm:w-auto font-ethno mx-auto"
                    asChild
                  >
                    <a
                      href="/customBuild"
                      onClick={() => {
                        /* handle start build click */
                      }}
                    >
                      <Zap className="relative sm:w-auto inline-flex w-4 h-4 mr-2" />
                      START YOUR BUILD
                      <motion.div
                        className="ml-2 sm:w-auto"
                        animate={{ x: [0, 5, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                      />
                    </a>
                  </Button>
                </motion.div>

                <motion.div whileTap={{ scale: 0.98 }}>
                  <Button
                    size={isMobile ? 'xs' : 'sm'}
                    variant="outline"
                    className="font-ethno mt-2 w-full align-middle sm:w-auto mx-auto"
                    asChild
                  >
                    <a
                      href="/services"
                      onClick={() => {
                        /* handle explore services click */
                      }}
                    >
                      <Wrench className="relative inline-flex w-4 h-4 mr-2" />
                      EXPLORE SERVICES
                    </a>
                  </Button>
                </motion.div>
              </div>

              {/* Performance Stats */}
              <motion.div
                className="grid grid-cols-3 gap-4 max-w-md mx-auto justify-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2.3, duration: 0.8 }}
              >
                {[
                  { value: '15+', label: 'YEARS EXPERIENCE' },
                  { value: '500+', label: 'BUILDS COMPLETED' },
                  { value: '1500+', label: 'HORSEPOWER GAINS' }
                ].map((stat, index) => (
                  <motion.div
                    key={index}
                    className="text-center"
                    whileHover={{ scale: 1.05 }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 2.5 + index * 0.1, duration: 0.5 }}
                  >
                    <div className="text-xl lg:text-3xl font-black text-primary font-cyber">
                      {stat.value}
                    </div>
                    <div className="text-xs lg:text-sm text-graylight font-medium tracking-wider font-ethno">
                      {stat.label}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Car Showcase */}
          <motion.div
            className="relative order-first xl:order-last"
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ delay: 0.5, duration: 1.2, ease: 'easeOut' }}
          >
            {/* Racing stripe effect */}
            <div className="absolute inset-0 racing-stripe opacity-30"></div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default Hero;

// Remove the CSS from the TypeScript file.
// If you need this style, move it to a CSS file, e.g., Hero.module.css or global.css, and import it.
