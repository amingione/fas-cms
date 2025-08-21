import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ArrowRight, Zap, Award, Star, Phone, ShoppingCart } from 'lucide-react';

export function WheelsHero() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <section ref={ref} className="relative py-8 md:py-12 overflow-hidden">
      {/* Background with asphalt texture */}
      <div className="absolute inset-0 asphalt-texture">
        <div className="absolute inset-0 bg-gradient-to-br from-black/95 via-gray-900/85 to-black/95"></div>
        <div className="absolute inset-0 grunge-overlay"></div>
      </div>

      {/* Dynamic racing stripes */}
      <div className="absolute inset-0">
        <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-transparent via-primary to-transparent opacity-40"></div>
        <div className="absolute right-0 top-0 bottom-0 w-2 bg-gradient-to-b from-transparent via-primary to-transparent opacity-40"></div>
        <div className="absolute left-1/3 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>
        <div className="absolute right-1/3 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 md:px-6">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="text-center mb-12 md:mb-16"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="mb-4"
          >
            <Badge className="bg-primary/20 text-primary border-primary/30 px-4 py-2 font-ethno text-xs md:text-sm">
              <Award className="w-3 h-3 md:w-4 md:h-4 mr-2" />
              AUTHORIZED DEALER
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-4xl md:text-6xl lg:text-7xl font-black text-white mb-4 font-cyber tracking-wider leading-tight"
          >
            COMPLETE
          </motion.h1>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="text-4xl md:text-6xl lg:text-7xl font-black text-primary mb-6 font-ethno-italic engine-pulse tracking-wider leading-tight"
          >
            YOUR BUILD
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="text-base md:text-lg text-graylight max-w-3xl mx-auto font-kwajong leading-relaxed"
          >
            F.A.S. Motorsports is your authorized dealer for{' '}
            <span className="text-primary font-semibold">BelaK Wheels</span> and{' '}
            <span className="text-primary font-semibold">JTX Forged Wheels</span>. From street
            performance to show-stopping luxury, we have the perfect wheels to complete your custom
            build.
          </motion.p>
        </motion.div>

        {/* Photo Collage Section 1 - Hero Wheel with Sales Copy */}
        <div className="relative mb-16 md:mb-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Main Hero Wheel - BelaK Street Performance */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, x: -100 }}
              animate={isInView ? { opacity: 1, scale: 1, x: 0 } : {}}
              transition={{ delay: 1, duration: 1, ease: 'easeOut' }}
              className="order-2 lg:order-1"
            >
              <div className="relative w-full max-w-lg mx-auto lg:max-w-none aspect-square rounded-2xl overflow-hidden industrial-glow">
                <div className="absolute inset-0 bg-gradient-to-br from-gray-800/20 to-black/60"></div>
                <img
                  src="images/belak custom red.png"
                  alt="BelaK Wheels - Street Performance"
                  className="w-full h-full object-contain object-center p-6 md:p-8"
                  loading="lazy"
                />
                {/* Overlay Text */}
                <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8">
                  <div className="bg-black/80 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-primary/20">
                    <h3 className="text-xl md:text-2xl font-black text-white font-cyber3d mb-2">
                      BELAK WHEELS
                    </h3>
                    <p className="text-primary font-ethno-italic text-base md:text-lg mb-3">
                      STREET PERFORMANCE
                    </p>
                    <div className="flex items-center text-sm text-graylight font-kwajong">
                      <Star className="w-4 h-4 text-primary mr-2" />
                      LIGHTWEIGHT FORGED
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Sales Copy Block */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 1.4, duration: 0.8 }}
              className="order-1 lg:order-2 space-y-6"
            >
              <div className="bg-gradient-to-r from-primary/90 to-red-600/90 backdrop-blur-sm rounded-xl p-6 md:p-8 border border-primary/30 industrial-glow">
                <h3 className="text-2xl md:text-3xl font-black text-white font-borg mb-4">
                  COMPLETE
                  <span className="block text-accent font-ethno-italic">THE LOOK</span>
                </h3>
                <p className="text-white/90 text-base md:text-lg font-kwajong leading-relaxed mb-4">
                  From street to strip, we have the perfect wheels to finish your F.A.S. build.
                  Every wheel is engineered for performance and crafted for style.
                </p>
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center text-sm text-white/80 font-kwajong">
                    <div className="w-2 h-2 bg-accent rounded-full mr-2"></div>
                    STREET TESTED
                  </div>
                  <div className="flex items-center text-sm text-white/80 font-kwajong">
                    <div className="w-2 h-2 bg-accent rounded-full mr-2"></div>
                    TRACK PROVEN
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Photo Collage Section 2 - JTX Forged with Dealer Info */}
        <div className="relative mb-16 md:mb-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Dealer Authorization Block */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 1.8, duration: 0.8 }}
              className="space-y-6"
            >
              <div className="bg-gradient-to-r from-gray-900/90 to-black/90 backdrop-blur-sm rounded-xl p-6 md:p-8 border border-white/20 industrial-glow">
                <h3 className="text-2xl md:text-3xl font-black text-white font-cyber3d mb-4">
                  AUTHORIZED
                  <span className="block text-graylight font-ethno-italic">DEALER</span>
                </h3>
                <p className="text-graylight text-base md:text-lg font-kwajong leading-relaxed mb-4">
                  Official dealer for BelaK & JTX Forged premium wheel brands. We provide authentic
                  products with full manufacturer warranties.
                </p>
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center text-sm text-graylight font-kwajong">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                    FACTORY AUTHORIZED
                  </div>
                  <div className="flex items-center text-sm text-graylight font-kwajong">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                    FULL WARRANTY
                  </div>
                </div>
              </div>
            </motion.div>

            {/* JTX Forged Wheel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, x: 100 }}
              animate={isInView ? { opacity: 1, scale: 1, x: 0 } : {}}
              transition={{ delay: 2.2, duration: 1, ease: 'easeOut' }}
            >
              <div className="relative w-full max-w-lg mx-auto lg:max-w-none aspect-square rounded-2xl overflow-hidden industrial-glow">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-black/60"></div>
                <img
                  src="/images/jtx forged single.png"
                  alt="JTX Forged Wheels - Luxury Performance"
                  className="w-full h-full object-contain object-center p-6 md:p-8"
                  loading="lazy"
                />
                {/* Overlay Text */}
                <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8">
                  <div className="bg-black/80 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-blue-500/20">
                    <h3 className="text-xl md:text-2xl font-black text-white font-cyber3d mb-2">
                      JTX FORGED
                    </h3>
                    <p className="text-blue-400 font-ethno-italic text-base md:text-lg mb-3">
                      LUXURY PERFORMANCE
                    </p>
                    <div className="flex items-center text-sm text-graylight font-kwajong">
                      <Star className="w-4 h-4 text-blue-400 mr-2" />
                      SHOW QUALITY
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Photo Collage Section 3 - BelaK Racing */}
        <div className="relative mb-16 md:mb-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* BelaK Racing Wheel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 100 }}
              animate={isInView ? { opacity: 1, scale: 1, y: 0 } : {}}
              transition={{ delay: 2.6, duration: 1, ease: 'easeOut' }}
              className="order-2 lg:order-1"
            >
              <div className="relative w-full max-w-lg mx-auto lg:max-w-none aspect-square rounded-2xl overflow-hidden industrial-glow">
                <div className="absolute inset-0 bg-gradient-to-br from-red-900/20 to-black/60"></div>
                <img
                  src="/images/17x4-5-Series-3_2-e1692046131582-715x715-2.png"
                  alt="BelaK Racing - Drag Strip Ready"
                  className="w-full h-full object-contain object-center p-6 md:p-8"
                  loading="lazy"
                />
                {/* Overlay Text */}
                <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8">
                  <div className="bg-black/80 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-primary/20">
                    <h3 className="text-xl md:text-2xl font-black text-white font-cyber3d mb-2">
                      BELAK RACING
                    </h3>
                    <p className="text-primary font-ethno-italic text-base md:text-lg mb-3">
                      DRAG STRIP READY
                    </p>
                    <div className="flex items-center text-sm text-graylight font-kwajong">
                      <Zap className="w-4 h-4 text-primary mr-2" />
                      COMPETITION GRADE
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Performance Features Block */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 3, duration: 0.8 }}
              className="order-1 lg:order-2 space-y-6"
            >
              <div className="bg-gradient-to-r from-red-900/80 to-black/90 backdrop-blur-sm rounded-xl p-6 md:p-8 border border-primary/30 industrial-glow">
                <h3 className="text-2xl md:text-3xl font-black text-white font-cyber3d mb-4">
                  PERFORMANCE
                  <span className="block text-primary font-ethno-italic">DRIVEN</span>
                </h3>
                <p className="text-graylight text-base md:text-lg font-kwajong leading-relaxed mb-4">
                  Built for the demands of racing and engineered for maximum performance. Every
                  wheel is tested to withstand extreme conditions.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center text-sm text-graylight font-kwajong">
                    <Zap className="w-4 h-4 text-primary mr-3" />
                    DRAG STRIP TESTED
                  </div>
                  <div className="flex items-center text-sm text-graylight font-kwajong">
                    <Star className="w-4 h-4 text-primary mr-3" />
                    COMPETITION GRADE MATERIALS
                  </div>
                  <div className="flex items-center text-sm text-graylight font-kwajong">
                    <Award className="w-4 h-4 text-primary mr-3" />
                    RACE PROVEN DESIGN
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Call to Action Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 3.4, duration: 0.8 }}
          className="text-center"
        >
          <div className="bg-gradient-to-r from-gray-900/90 via-black/90 to-gray-900/90 rounded-2xl border border-gray-700/50 p-6 md:p-8 max-w-4xl mx-auto industrial-glow">
            <div className="mb-6">
              <h2 className="text-2xl md:text-3xl font-black text-white font-cyber3d mb-3">
                PREMIUM WHEELS FOR EVERY BUILD
              </h2>
              <p className="text-sm md:text-base text-graylight font-kwajong max-w-2xl mx-auto">
                Whether you're building for the street, strip, or show - F.A.S. Motorsports has the
                perfect wheels to complete your vision.
                <span className="text-primary font-semibold"> BelaK</span> and
                <span className="text-primary font-semibold"> JTX Forged</span> - engineered for
                performance.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
              <Button
                className="bg-primary hover:bg-primary/90 text-white font-ethno px-8 py-4 text-base metallic-btn industrial-glow group"
                size="lg"
              >
                <ShoppingCart className="w-5 h-5 mr-2 group-hover:animate-bounce" />
                SHOP WHEELS
                <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button
                variant="outline"
                className="border-primary/50 text-primary hover:bg-primary/10 font-ethno px-8 py-4 text-base group"
                size="lg"
              >
                <Phone className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform" />
                GET QUOTE
                <Star className="w-5 h-5 ml-2 group-hover:rotate-180 transition-transform duration-500" />
              </Button>
            </div>

            {/* Brand Highlights */}
            <div className="flex flex-wrap justify-center gap-6 pt-6 border-t border-gray-700/30">
              <div className="flex items-center text-sm text-graylight font-kwajong">
                <div className="w-3 h-3 bg-primary rounded-full mr-3"></div>
                STREET PERFORMANCE
              </div>
              <div className="flex items-center text-sm text-graylight font-kwajong">
                <div className="w-3 h-3 bg-blue-400 rounded-full mr-3"></div>
                LUXURY FORGED
              </div>
              <div className="flex items-center text-sm text-graylight font-kwajong">
                <div className="w-3 h-3 bg-red-400 rounded-full mr-3"></div>
                DRAG OPTIMIZED
              </div>
              <div className="flex items-center text-sm text-graylight font-kwajong">
                <div className="w-3 h-3 bg-accent rounded-full mr-3"></div>
                CUSTOM FINISHES
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
