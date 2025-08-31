import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ArrowRight, Zap, Settings, Award } from 'lucide-react';
import { motion, useInView } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';

export function TruckPackagesHero() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const packageHighlights = [
    {
      icon: Zap,
      title: 'Power Upgrades',
      description: 'Supercharger & turbo systems'
    },
    {
      icon: Settings,
      title: 'Custom Builds',
      description: 'Tailored to your specifications'
    },
    {
      icon: Award,
      title: 'Professional Install',
      description: 'Expert installation & tuning'
    }
  ];

  return (
    <section
      id="truck-packages"
      className={`relative ${isMobile ? 'min-h-auto py-8' : 'min-h-screen'} flex items-center justify-center overflow-hidden asphalt-texture`}
    >
      {/* Background with enhanced grunge */}
      <div className="absolute inset-0 grunge-overlay"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black/80"></div>

      {/* Tire track effects - hidden on mobile for performance */}
      {!isMobile && <div className="absolute inset-0 tire-tracks opacity-20"></div>}

      {/* Dynamic background elements - reduced on mobile */}
      {!isMobile && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute"
              style={{
                left: `${10 + i * 15}%`,
                top: `${20 + (i % 3) * 30}%`,
                width: '2px',
                height: '60px'
              }}
              animate={{
                opacity: [0.1, 0.3, 0.1],
                scaleY: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: i * 0.5,
                ease: 'easeInOut'
              }}
            >
              <div className="w-full h-full bg-gradient-to-b from-transparent via-primary/50 to-transparent"></div>
            </motion.div>
          ))}
        </div>
      )}

      <div
        className={`mx-auto relative z-10 ${isMobile ? 'w-full px-4' : 'container px-6 lg:px-8'}`}
        ref={ref}
      >
        {/* Mobile vs Desktop Layout */}
        {isMobile ? (
          <div className="relative space-y-6 py-6">
            {/* Mobile Content Section */}
            <motion.div
              className="relative space-y-4"
              initial={{ opacity: 0, x: 0, y: 30, scale: 1 }}
              animate={isInView ? { opacity: 1, x: 0, y: 0, scale: 1 } : {}}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              style={{ transform: 'none' }}
            >
              {/* Mobile Logo & Badge */}
              <motion.div
                className="relative text-left space-y-3" // changed from text-center
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                <div className="relative flex items-start space-x-3">
                  <div className="relative align-start justify-items-start w-12 h-12 flex engine-pulse">
                    <img
                      src="images/faslogochroma.png"
                      alt="F.A.S. Motorsports"
                      className="w-10 h-10 object-contain drop-shadow-xl"
                    />
                  </div>
                  <div>
                    <div className="text-white font-bold align-left relative text-sm tracking-wide font-borg">
                      F.a.S.
                    </div>
                    <div className="text-primary font-bold text-sm tracking-wider font-ethno">
                      MOTORSPORTS
                    </div>
                  </div>
                </div>

                <Badge
                  variant="outline"
                  className="relative items-center bg-primary/20 border-primary/50 text-primary px-4 py-1 text-xs font-bold tracking-widest backdrop-blur-sm industrial-card font-ethno"
                >
                  CUSTOM PERFORMANCE PACKAGES
                </Badge>
              </motion.div>

              {/* Mobile Main Heading */}
              <motion.div
                className="relative text-left space-y-2"
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.4, duration: 0.8 }}
              >
                <h1 className="font-black leading-tight tracking-tight font-captain">
                  <span className="block text-accent font-ethno text-xl">TRUCK</span>
                  <span className="block text-accent font-ethno text-xl">PACKAGES</span>
                  <span className="block chrome-text text-lg mt-1 font-borg">RAM TRX</span>
                </h1>

                <motion.p
                  className="text-secondary font-light tracking-wide font-kwajong text-xs px-2 leading-relaxed"
                  initial={{ opacity: 0, y: 15 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.6, duration: 0.6 }}
                >
                  FROM MILD TO WILD —{' '}
                  <span className="font-bold text-white">
                    OUR CUSTOM PACKAGES ARE BUILT TO DOMINATE
                  </span>
                </motion.p>
              </motion.div>

              {/* Mobile Package Highlights */}
              <motion.div
                className="space-y-3"
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.8, duration: 0.6 }}
              >
                {packageHighlights.map((highlight, index) => {
                  const Icon = highlight.icon;
                  return (
                    <motion.div
                      key={index}
                      className="flex items-center space-x-3 bg-black/40 rounded-xl p-3 border border-gray-700/50 backdrop-blur-sm"
                      initial={{ opacity: 0, x: -15 }}
                      animate={isInView ? { opacity: 1, x: 0 } : {}}
                      transition={{ delay: 1 + index * 0.1, duration: 0.5 }}
                    >
                      <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center border border-primary/30 industrial-card">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm font-ethno">
                          {highlight.title}
                        </div>
                        <div className="text-graylight text-xs">{highlight.description}</div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>

              {/* Mobile Call to Action */}
              <motion.div
                className="space-y-4"
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 1.2, duration: 0.6 }}
              >
                <div className="flex flex-col gap-3 max-w-sm mx-auto">
                  <motion.div whileTap={{ scale: 0.98 }}>
                    <Button
                      className="group bg-primary hover:bg-primary/90 text-white w-full py-3 text-sm font-bold shadow-xl shadow-primary/25 transition-all duration-300 rounded-xl metallic-btn font-ethno mobile-touch-target"
                      asChild
                    >
                      <a href="/truckPackages">
                        <Zap className="w-4 h-4 mr-2" />
                        SHOP PACKAGES
                        <motion.div
                          className="ml-2"
                          animate={{ x: [0, 3, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                        >
                          <ArrowRight className="w-4 h-4" />
                        </motion.div>
                      </a>
                    </Button>
                  </motion.div>

                  <motion.div whileTap={{ scale: 0.98 }}>
                    <Button
                      variant="outline"
                      className="border-2 border-graylight/50 text-graylight hover:bg-primary/20 hover:text-white hover:border-primary/70 w-full py-3 text-sm font-medium backdrop-blur-sm hover:backdrop-blur-md rounded-xl transition-all duration-300 industrial-glow font-ethno mobile-touch-target"
                      asChild
                    >
                      <a href="#contact">
                        <Settings className="w-4 h-4 mr-2" />
                        CUSTOM QUOTE
                      </a>
                    </Button>
                  </motion.div>
                </div>

                <div className="flex flex-col space-y-2 text-center text-xs text-graylight">
                  <div className="flex items-center justify-center space-x-1">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                    <span>Expert Installation</span>
                  </div>
                  <div className="flex items-center justify-center space-x-1">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                    <span>Performance Tuning</span>
                  </div>
                  <div className="flex items-center justify-center space-x-1">
                    <div className="w-1.5 h-1.5 bg-accent rounded-full"></div>
                    <span>Warranty Backed</span>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Mobile Truck Showcase */}
            <motion.div
              className="relative mt-6"
              initial={{ opacity: 0, x: 0, y: 30, scale: 1 }}
              animate={isInView ? { opacity: 1, x: 0, y: 0, scale: 1 } : {}}
              transition={{ delay: 1.4, duration: 0.8 }}
              style={{ transform: 'none' }}
            >
              <div className="relative">
                {/* Mobile truck image */}
                <motion.div
                  className="relative z-10"
                  initial={{ opacity: 0, x: 0, y: 0, scale: 1 }}
                  animate={isInView ? { opacity: 1, x: 0, y: 0, scale: 1 } : {}}
                  transition={{ delay: 1.6, duration: 0.6 }}
                  style={{ transform: 'none' }}
                >
                  <img
                    src="images/TRX Truck Package FAS copy.png"
                    alt="F.A.S. Motorsports Custom RAM TRX Packages - Performance Truck Builds"
                    className="w-full h-auto mx-auto drop-shadow-xl rounded-xl"
                  />
                </motion.div>

                {/* Mobile Performance indicators - repositioned to avoid overlap */}
                <div className="relativemt-4 grid grid-cols-2 gap-3 max-w-xs mx-auto">
                  <motion.div
                    className="bg-black/80 rounded-xl p-3 backdrop-blur-sm border border-primary/30 industrial-card text-center"
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: 1.8, duration: 0.5 }}
                  >
                    <div className="text-lg font-bold text-primary font-cyber">702+</div>
                    <div className="text-xs text-graylight font-medium font-ethno">HORSEPOWER</div>
                  </motion.div>

                  <motion.div
                    className="bg-black/80 rounded-xl p-3 backdrop-blur-sm border border-blue-500/30 industrial-card text-center"
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: 2, duration: 0.5 }}
                  >
                    <div className="text-lg font-bold text-blue-400 font-cyber">650+</div>
                    <div className="text-xs text-graylight font-medium font-ethno">TORQUE</div>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        ) : (
          // Desktop Layout
          <div className="grid lg:grid-cols-2 gap-16 items-center min-h-screen py-24">
            {/* Desktop Content Section */}
            <motion.div
              className="space-y-8 lg:space-y-12"
              initial={{ opacity: 0, x: -100 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 1, ease: 'easeOut' }}
            >
              {/* Desktop Logo & Badge */}
              <motion.div
                className="space-y-6"
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.2, duration: 0.8 }}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 flex items-center justify-center engine-pulse">
                    <img
                      src="images/faslogochroma.png"
                      alt="F.A.S. Motorsports"
                      className="w-14 h-14 object-contain drop-shadow-2xl"
                    />
                  </div>
                  <div>
                    <div className="text-white font-bold text-xl tracking-wide font-borg">
                      F.a.S.
                    </div>
                    <div className="text-primary font-bold text-lg tracking-wider font-ethno">
                      MOTORSPORTS
                    </div>
                  </div>
                </div>

                <Badge
                  variant="outline"
                  className="bg-primary/20 border-primary/50 text-primary px-6 py-2 text-sm font-bold tracking-widest backdrop-blur-sm industrial-card font-ethno"
                >
                  CUSTOM PERFORMANCE PACKAGES
                </Badge>
              </motion.div>

              {/* Desktop Main Heading */}
              <motion.div
                className="space-y-4"
                initial={{ opacity: 0, y: 50 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.4, duration: 1 }}
              >
                <h1 className="text-5xl lg:text-8xl font-black leading-tight tracking-tight font-ethno">
                  <span className="block text-accent">TRUCK</span>
                  <span className="block text-accent">PACKAGES</span>
                  <span className="block chrome-text text-4xl lg:text-6xl mt-2 font-borg">
                    RAM TRX
                  </span>
                </h1>

                <motion.p
                  className="text-xl lg:text-2xl text-secondary font-light tracking-wide max-w-2xl font-kwajong"
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.8, duration: 0.8 }}
                >
                  FROM MILD TO WILD —{' '}
                  <span className="font-bold text-white">
                    OUR CUSTOM PACKAGES ARE BUILT TO DOMINATE
                  </span>
                </motion.p>
              </motion.div>

              {/* Desktop Package Highlights */}
              <motion.div
                className="grid gap-4"
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 1, duration: 0.8 }}
              >
                {packageHighlights.map((highlight, index) => {
                  const Icon = highlight.icon;
                  return (
                    <motion.div
                      key={index}
                      className="flex items-center space-x-4 group"
                      initial={{ opacity: 0, x: -20 }}
                      animate={isInView ? { opacity: 1, x: 0 } : {}}
                      transition={{ delay: 1.2 + index * 0.2, duration: 0.6 }}
                      whileHover={{ x: 8 }}
                    >
                      <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/30 group-hover:border-primary/50 transition-all duration-300 industrial-card">
                        <Icon className="w-6 h-6 text-primary group-hover:text-primary transition-colors duration-300" />
                      </div>
                      <div>
                        <div className="font-bold text-white group-hover:text-primary transition-colors duration-300 font-ethno">
                          {highlight.title}
                        </div>
                        <div className="text-graylight font-light">{highlight.description}</div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>

              {/* Desktop Call to Action */}
              <motion.div
                className="space-y-6"
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 1.8, duration: 0.8 }}
              >
                <div className="flex flex-col sm:flex-row gap-4">
                  <motion.div whileTap={{ scale: 0.98 }}>
                    <Button size="lg" className="group font-ethno" asChild>
                      <a
                        href="/truckPackages"
                        onClick={() => {
                          /* handle shop packages click */
                        }}
                      >
                        <Zap className="w-5 h-5 mr-3" />
                        SHOP PACKAGES
                        <motion.div
                          className="ml-3"
                          animate={{ x: [0, 5, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                        >
                          <ArrowRight className="w-5 h-5" />
                        </motion.div>
                      </a>
                    </Button>
                  </motion.div>

                  <motion.div whileTap={{ scale: 0.98 }}>
                    <Button size="lg" variant="outline" className="font-ethno" asChild>
                      <a
                        href="#contact"
                        onClick={() => {
                          /* handle custom quote click */
                        }}
                      >
                        <Settings className="w-5 h-5 mr-3" />
                        CUSTOM QUOTE
                      </a>
                    </Button>
                  </motion.div>
                </div>

                <div className="flex items-center space-x-8 text-sm text-graylight">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span>Expert Installation</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <span>Performance Tuning</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-accent rounded-full"></div>
                    <span>Warranty Backed</span>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Desktop Truck Showcase */}
            <motion.div
              className="relative"
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={isInView ? { opacity: 1, x: 0, scale: 1 } : {}}
              transition={{ delay: 0.6, duration: 1.2, ease: 'easeOut' }}
            >
              <div className="relative">
                {/* Enhanced truck image with effects */}
                <motion.div
                  className="relative z-10"
                  whileHover={{ scale: 1.02, rotateY: 1 }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  style={{ perspective: '1000px' }}
                >
                  <img
                    src="images/TRX Truck Package FAS copy.png"
                    alt="F.A.S. Motorsports Custom RAM TRX Packages - Performance Truck Builds"
                    className="w-full h-auto max-w-4xl mx-auto drop-shadow-2xl rounded-2xl"
                  />
                </motion.div>

                {/* Glowing effects around trucks */}
                <div className="absolute -top-8 -right-8 w-32 h-32 bg-gradient-to-br from-primary/30 to-accent/20 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-gradient-to-br from-blue-500/30 to-cyan-500/20 rounded-full blur-2xl"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-3xl"></div>

                {/* Performance indicators */}
                <motion.div
                  className="absolute top-10 right-8 bg-black/80 rounded-2xl p-5 backdrop-blur-sm border border-primary/30 industrial-card"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={isInView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ delay: 2, duration: 0.6 }}
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary font-cyber">702+</div>
                    <div className="text-xs text-graylight font-medium font-ethno">HORSEPOWER</div>
                  </div>
                </motion.div>

                <motion.div
                  className="absolute bottom-8 left-8 bg-black/80 rounded-2xl p-4 backdrop-blur-sm border border-blue-500/30 industrial-card"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={isInView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ delay: 2.2, duration: 0.6 }}
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400 font-cyber">650+</div>
                    <div className="text-xs text-graylight font-medium font-ethno">TORQUE</div>
                  </div>
                </motion.div>

                {/* Racing stripe effect */}
                <div className="absolute inset-0 racing-stripe opacity-30"></div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Scroll indicator - Desktop only */}
        {!isMobile && (
          <motion.div
            className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 2.5, duration: 0.8 }}
          />
        )}
      </div>
    </section>
  );
}

export default TruckPackagesHero;
