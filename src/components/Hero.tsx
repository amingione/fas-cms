import { Button } from '@/components/ui/button';
import { ArrowRight, Zap, Shield, Wrench } from 'lucide-react';
import { motion } from 'framer-motion';

export function Hero() {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center justify-center overflow-hidden asphalt-texture"
    >
      {/* Background Effects */}
      <div className="absolute inset-0 grunge-overlay"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black/80"></div>

      {/* Racing stripes */}
      <div className="absolute inset-0 racing-stripe opacity-20"></div>

      {/* Animated performance indicators */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
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
            <div className="w-full h-full bg-gradient-to-b from-transparent via-primary/60 to-transparent"></div>
          </motion.div>
        ))}
      </div>

      <div className="container mx-auto px-4 lg:px-6 relative z-10">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 xl:gap-16 items-center min-h-screen py-20">
          {/* Content Section */}
          <motion.div
            className="space-y-6 lg:space-y-8 max-w-3xl mx-auto xl:mx-0"
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, ease: 'easeOut' }}
          >
            {/* Main Title */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 1 }}
              className="space-y-2"
            >
              <h1 className="font-black leading-tight tracking-tight font-ethno">
                <span className="block font-borg text-white text-3xl sm:text-4xl lg:text-6xl xl:text-7xl">
                  F.a.S.
                </span>
                <span className="block chrome-text font-ethno text-base sm:text-base lg:text-3xl xl:text-4xl">
                  MOTORSPORTS
                </span>
              </h1>

              <motion.p
                className="text-sm sm:text-base lg:text-lg xl:text-xl text-secondary font-light tracking-wide font-kwajong"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.8 }}
              >
                PRECISION ENGINEERING • CUSTOM FABRICATION • PERFORMANCE TUNING
              </motion.p>

              <motion.div
                className="text-xs sm:text-sm text-accent font-borg tracking-widest"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.1, duration: 0.8 }}
              >
                — SOUTHWEST FLORIDA'S PREMIER PERFORMANCE SHOP —
              </motion.div>
            </motion.div>

            {/* Feature Icons */}
            <motion.div
              className="flex justify-center xl:justify-start items-center space-x-6 lg:space-x-8"
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
                    className="text-center group cursor-pointer"
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
              className="space-y-4"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.8, duration: 0.8 }}
            >
              <div className="flex flex-col sm:flex-row gap-3 justify-center xl:justify-start">
                <motion.div whileTap={{ scale: 0.98 }}>
                  <Button size={isMobile ? 'sm' : 'lg'} className="group font-ethno" asChild>
                    <a
                      href="#build"
                      onClick={() => {
                        /* handle start build click */
                      }}
                    >
                      <Zap className="relative inline-flex w-4 h-4 mr-2" />
                      START YOUR BUILD
                      <motion.div
                        className="ml-2"
                        animate={{ x: [0, 5, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                      />
                    </a>
                  </Button>
                </motion.div>

                <motion.div whileTap={{ scale: 0.98 }}>
                  <Button
                    size={isMobile ? 'sm' : 'lg'}
                    variant="outline"
                    className="font-ethno"
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
                className="grid grid-cols-3 gap-4 max-w-md mx-auto xl:mx-0"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2.3, duration: 0.8 }}
              >
                {[
                  { value: '15+', label: 'YEARS EXPERIENCE' },
                  { value: '500+', label: 'BUILDS COMPLETED' },
                  { value: '1000+', label: 'HORSEPOWER GAINS' }
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
            <div className="relative max-w-2xl mx-auto">
              {/* Enhanced car image with effects */}
              <motion.div
                className="relative z-10"
                whileHover={{ scale: 1.02, rotateY: 2 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                style={{ perspective: '1000px' }}
              >
                <img
                  src="/images/challenger FAS.png"
                  alt="F.A.S. Motorsports High Performance Challenger - Custom Supercharger Build"
                  className="w-full h-auto mx-auto drop-shadow-2xl rounded-2xl"
                />
              </motion.div>

              {/* Glowing effects around car */}
              <div className="absolute -top-8 -right-8 w-32 h-32 bg-gradient-to-br from-primary/40 to-accent/20 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-gradient-to-br from-blue-500/30 to-cyan-500/20 rounded-full blur-2xl"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-3xl"></div>

              {/* Performance indicators */}
              <motion.div
                className="absolute top-4 right-4 bg-black/80 rounded-xl p-3 backdrop-blur-sm border border-primary/30 industrial-card"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 2, duration: 0.6 }}
                whileHover={{ scale: 1.05 }}
              >
                <div className="relative mr-8 ml-8 text-center">
                  <div className="text-lg mr-2 ml-2 font-bold text-primary font-cyber">800+</div>
                  <div className="text-xs text-graylight font-medium font-ethno">HP</div>
                </div>
              </motion.div>

              <motion.div
                className="absolute bottom-4 left-4 bg-black/80 rounded-xl p-3 backdrop-blur-sm border border-blue-500/30 industrial-card"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 2.2, duration: 0.6 }}
                whileHover={{ scale: 1.05 }}
              >
                <div className="relative mr-8 ml-8 text-center">
                  <div className="text-lg font-bold font-borg text-blue-400">F.a.S.</div>
                  <div className="text-xs text-graylight font-medium font-ethno">TUNED</div>
                </div>
              </motion.div>

              {/* Racing stripe effect */}
              <div className="absolute inset-0 racing-stripe opacity-20"></div>
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 3, duration: 0.8 }}
        ></motion.div>
      </div>
    </section>
  );
}
