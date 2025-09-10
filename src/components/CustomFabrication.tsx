import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ArrowRight, Flame, Wrench, Gauge, Zap, Settings, Award } from 'lucide-react';
import { motion, useInView } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';

export function CustomFabrication() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const fabricationServices = [
    {
      icon: Flame,
      title: 'Turbo & Supercharger Kits',
      description:
        'Complete forced induction systems designed for maximum performance and reliability.',
      features: ['Custom Piping', 'Heat Management', 'ECU Tuning', 'Dyno Testing']
    },
    {
      icon: Wrench,
      title: 'Exhaust Systems',
      description: 'Hand-built exhaust systems optimized for flow, sound, and performance gains.',
      features: ['Stainless Steel', 'Custom Routing', 'Sound Tuning', 'Headers']
    },
    {
      icon: Gauge,
      title: 'Complete Builds',
      description:
        'Total vehicle transformations with custom measurements and one-off fabrication.',
      features: ['Engine Swaps', 'Suspension', 'Roll Cages', 'Interior Work']
    }
  ];

  const capabilities = [
    {
      icon: Flame,
      label: 'TIG Welding',
      description: 'Precision aluminum & steel'
    },
    {
      icon: Settings,
      label: 'CNC Machining',
      description: 'Custom billet components'
    },
    {
      icon: Gauge,
      label: 'Dyno Tuning',
      description: 'Performance optimization'
    },
    {
      icon: Award,
      label: 'R&D Testing',
      description: 'Proven reliability'
    }
  ];

  const ServiceCard = ({ service, index }: { service: any; index: number }) => {
    const Icon = service.icon;
    return (
      <motion.div
        key={index}
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 1 + index * 0.2, duration: 0.6 }}
        whileHover={!isMobile ? { x: 10, scale: 1.02 } : {}}
        className={`group cursor-pointer ${isMobile ? 'snap-start shrink-0 w-[85%]' : ''}`}
      >
        <Card
          className={`border-gray-700/50  relative hover:border-primary/50 transition-all duration-500 bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-sm industrial-card ${isMobile ? 'h-full' : ''}`}
        >
          <CardHeader
            className={`flex items-center space-y-0 ${isMobile ? 'flex-col space-y-2 p-3' : 'flex-row space-x-4'}`}
          >
            <div
              className={`bg-gradient-to-br from-primary to-red-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 engine-pulse ${isMobile ? 'w-10 h-10' : 'w-14 h-14'}`}
            >
              <Icon className={`${isMobile ? 'w-5 h-5' : 'w-7 h-7'} text-white`} />
            </div>
            <div className={`${isMobile ? 'text-center' : 'flex-1'}`}>
              <CardTitle
                className={`group-hover:text-primary transition-colors duration-300 font-bold font-ethno ${isMobile ? 'text-sm' : 'text-xl'}`}
              >
                {service.title}
              </CardTitle>
              <CardDescription
                className={`text-graylight font-kwajong ${isMobile ? 'text-xs mt-1' : 'mt-2'}`}
              >
                {service.description}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className={isMobile ? 'p-3' : ''}>
            <div className={`flex flex-wrap ${isMobile ? 'gap-1.5' : 'gap-2'}`}>
              {service.features.map((feature: string, featureIndex: number) => (
                <Badge
                  key={featureIndex}
                  variant="secondary"
                  className={`bg-secondary text-black border-primary border-gray-600/50 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all duration-300 font-ethno ${isMobile ? 'text-xs px-2 py-1' : 'text-xs'}`}
                >
                  {feature}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <section
      id="customfabrication"
      className={`relative ${isMobile ? 'py-4 min-h-auto mobile-section-padding' : 'py-24 overflow-visible'}`}
    >
      {/* Background effects */}
      <div className="absolute inset-0"></div>
      <div className="absolute inset-0"></div>

      {/* Welding spark effects - reduced on mobile */}
      {!isMobile && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute"
              style={{
                left: `${10 + i * 12}%`,
                top: `${15 + (i % 4) * 25}%`,
                width: '3px',
                height: '3px'
              }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0.5, 1.5, 0.5],
                backgroundColor: ['#ff6b35', '#ffd700', '#ff6b35']
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.3,
                ease: 'easeInOut'
              }}
            >
              <div className="w-full h-full bg-orange-400 rounded-full shadow-lg shadow-orange-400/50"></div>
            </motion.div>
          ))}
        </div>
      )}

      <div
        className={`mx-auto relative z-10 ${isMobile ? 'w-full max-w-screen-sm px-4' : 'container px-4 lg:px-6'}`}
        ref={ref}
      >
        {/* Section Header */}
        <motion.div
          className={`text-center space-y-3 ${isMobile ? 'mb-4' : 'mb-16'}`}
          initial={{ opacity: 0, y: 50 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <Badge
              variant="outline"
              className={`mb-4 bg-primary/10 border-primary/30 text-primary font-bold tracking-widest font-ethno ${isMobile ? 'px-3 py-1 text-xs' : 'px-6 py-2 text-sm'}`}
            >
              HANDCRAFTED EXCELLENCE
            </Badge>
          </motion.div>

          <motion.h2
            className={`font-black leading-tight font-mono mobile-section-title ${isMobile ? 'text-lg' : 'text-3xl lg:text-6xl'}`}
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            <span className={`block text-white ${isMobile ? 'text-sm' : ''}`}>PERFORMANCE</span>
            <span
              className={`block chrome-text font-cyber ${isMobile ? 'text-base' : 'text-4xl lg:text-7xl'}`}
            >
              FABRICATION
            </span>
            <span className={`block text-accent font-borg ${isMobile ? 'text-sm' : ''}`}>
              IN-HOUSE
            </span>
          </motion.h2>

          <motion.p
            className={`text-graylight max-w-3xl mx-auto leading-relaxed font-kwajong ${isMobile ? 'text-xs px-4' : 'text-lg'}`}
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.6, duration: 0.6 }}
          >
            Every component is meticulously designed, engineered, and hand-welded in our facility.
            From custom turbo kits to complete exhaust systems, we craft performance perfection for
            your unique build.
          </motion.p>
        </motion.div>

        {/* Mobile layout vs Desktop layout */}
        {isMobile ? (
          <div className="space-y-4 overflow-visible overflow-x-visible">
            {/* Mobile Fabrication Services Carousel */}
            <motion.div
              className="overflow-x-auto snap-x snap-mandatory overscroll-x-contain -mx-4 px-0"
              /** Prevent transforms on the scroll container to avoid iOS scroll issues */
              transformTemplate={() => 'none'}
              style={{ transform: 'none', WebkitOverflowScrolling: 'touch' }}
              role="region"
              aria-label="Fabrication services carousel"
              initial={{ opacity: 0, x: -100 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.8, duration: 0.8 }}
            >
              <div className="flex gap-3 px-4">
                {fabricationServices.map((service, index) => (
                  <ServiceCard key={index} service={service} index={index} />
                ))}
              </div>
            </motion.div>

            {/* Mobile Image Grid - Simplified */}
            <motion.div
              className="mt-4"
              initial={{ opacity: 0, x: 0, scale: 1 }}
              animate={isInView ? { opacity: 1, x: 0, scale: 1 } : {}}
              transition={{ delay: 1, duration: 1 }}
              /** Ensure Framer Motion never writes any transform string here */
              transformTemplate={() => 'none'}
              style={{ transform: 'none' }}
            >
              <div className="space-y-3">
                {/* TIG Welding Card */}
                <div className="relative mx-auto w-full max-w-[420px] rounded-2xl overflow-hidden shadow-lg industrial-glow bg-black/60 aspect-[4/3] sm:aspect-[16/9]">
                  <img
                    src="images/fabrication/FAS-Welding.png"
                    alt="Precision TIG Welding"
                    className={`w-full h-full ${isMobile ? 'object-contain' : 'object-cover'} object-center max-w-full`}
                    loading="lazy"
                  />
                  <div className="absolute inset-0"></div>
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <div className="bg-black/90 backdrop-blur-sm rounded-lg p-3 border border-primary/30">
                      <h3 className="text-white font-bold text-sm font-ethno text-center">
                        TIG WELDING
                      </h3>
                      <p className="text-white/80 text-xs font-kwajong text-center mt-1">
                        PRECISION JOINING
                      </p>
                    </div>
                  </div>
                </div>

                {/* Exhaust Work Card */}
                <div className="relative mx-auto w-full max-w-[420px] rounded-2xl overflow-hidden shadow-lg industrial-glow bg-black/60 aspect-[4/3] sm:aspect-[16/9]">
                  <img
                    src="images/fabrication/FAS-Fabrication-Installation.png"
                    alt="Custom Exhaust Systems"
                    className={`w-full h-full ${isMobile ? 'object-contain' : 'object-cover'} object-center max-w-full`}
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-blue-600/80 via-blue-600/20 to-transparent"></div>
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <div className="bg-black/90 backdrop-blur-sm rounded-lg p-3 border border-blue-500/30">
                      <h3 className="text-white font-bold text-sm font-ethno text-center">
                        EXHAUST WORK
                      </h3>
                      <p className="text-white/80 text-xs font-kwajong text-center mt-1">
                        CUSTOM SYSTEMS
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile Additional Info */}
              <div className="mt-4 bg-gradient-to-r from-gray-900/90 to-black/90 rounded-xl p-4 border border-gray-700/50 industrial-glow">
                <div className="text-center">
                  <h3 className="text-white font-bold text-sm font-cyber3d mb-2">
                    PRECISION FABRICATION
                  </h3>
                  <p className="text-graylight text-xs font-kwajong leading-relaxed">
                    From TIG welding to custom exhaust systems, we deliver superior craftsmanship
                    for every project.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-16 items-center mb-20">
            {/* Desktop Fabrication Services */}
            <motion.div
              className="space-y-8"
              initial={{ opacity: 0, x: -100 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.8, duration: 0.8 }}
            >
              {fabricationServices.map((service, index) => (
                <ServiceCard key={index} service={service} index={index} />
              ))}
            </motion.div>

            {/* Desktop Welding Gallery */}
            <motion.div
              className="relative"
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={isInView ? { opacity: 1, x: 0, scale: 1 } : {}}
              transition={{ delay: 1, duration: 1, ease: 'easeOut' }}
            >
              <div className="grid grid-cols-2 gap-0">
                <div className="space-y-6">
                  <motion.div
                    className="relative rounded-2xl overflow-hidden shadow-2xl group"
                    whileHover={{ scale: 1.05, rotateY: 5 }}
                    transition={{ duration: 0.5 }}
                    style={{ perspective: '1000px' }}
                  >
                    <img
                      src="images/fabrication/FAS-Welding.png"
                      alt="Precision TIG Welding"
                      className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="absolute bottom-4 left-4 text-white font-bold text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-ethno">
                      PRECISION TIG WELDING
                    </div>
                  </motion.div>

                  <motion.div
                    className="relative rounded-2xl overflow-hidden shadow-2xl group"
                    whileHover={{ scale: 1.05, rotateY: -5 }}
                    transition={{ duration: 0.5 }}
                    style={{ perspective: '1000px' }}
                  >
                    <img
                      src="images/fabrication/FAS-Fabrication-2.png"
                      alt="Custom Exhaust Component"
                      className="w-full h-40 object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-blue-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="absolute bottom-4 left-4 text-white font-bold text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-ethno">
                      CUSTOM EXHAUST WORK
                    </div>
                  </motion.div>
                </div>

                <div className="space-y-6 pt-12">
                  <motion.div
                    className="relative rounded-2xl overflow-hidden shadow-2xl group"
                    whileHover={{ scale: 1.05, rotateY: 5 }}
                    transition={{ duration: 0.5 }}
                    style={{ perspective: '1000px' }}
                  >
                    <img
                      src="/images/fabrication/FAS-Fabrication-1.png"
                      alt="Heat Treated Components"
                      className="w-full h-40 object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-purple-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="absolute bottom-4 left-4 text-white font-bold text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-ethno">
                      HEAT TREATED FINISH
                    </div>
                  </motion.div>

                  <motion.div
                    className="relative rounded-2xl overflow-hidden shadow-2xl group"
                    whileHover={{ scale: 1.05, rotateY: -5 }}
                    transition={{ duration: 0.5 }}
                    style={{ perspective: '1000px' }}
                  >
                    <img
                      src="images/fabrication/FAS-Fabrication-Installation.png"
                      alt="Artisan Craftsmanship"
                      className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-red-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="absolute bottom-4 left-4 text-white font-bold text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-ethno">
                      ARTISAN CRAFTSMANSHIP
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Floating quality badge */}
              <motion.div
                className="absolute -bottom-8 -left-8 bg-gradient-to-br from-primary/90 to-red-600/90 rounded-2xl p-0 backdrop-blur-sm border border-primary/20 shadow-2xl"
                initial={{ opacity: 0, scale: 0 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: 1.5, duration: 0.6 }}
                whileHover={{ scale: 1.05, y: -5 }}
              >
                <div className="text-center">
                  <Flame className="w-8 h-8 text-white mx-auto mb-2" />
                  <div className="text-2xl font-black text-white font-cyber">100%</div>
                  <div className="text-sm text-orange-100 font-bold font-ethno">IN-HOUSE</div>
                </div>
              </motion.div>

              {/* Glow effects */}
              <div className="absolute -top-4 -right-4 w-32 h-32 bg-gradient-to-br from-primary/20 to-red-500/20 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-2xl"></div>
            </motion.div>
          </div>
        )}

        {/* Capabilities Grid */}
        <motion.div
          className={`grid gap-4 ${isMobile ? 'grid-cols-2 gap-3 mb-4 max-w-sm mx-auto' : 'grid-cols-2 md:grid-cols-4 mb-16'}`}
          initial={{ opacity: 0, y: 50 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 1.8, duration: 0.8 }}
        >
          {capabilities.map((capability, index) => {
            const Icon = capability.icon;
            return (
              <motion.div
                key={index}
                className="text-center group cursor-pointer"
                whileHover={!isMobile ? { scale: 1.1, y: -10 } : {}}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 2 + index * 0.1, duration: 0.6 }}
              >
                <div
                  className={`bg-gradient-to-br from-primary/20 to-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:shadow-xl group-hover:shadow-primary/25 transition-all duration-300 border border-primary/20 industrial-card ${isMobile ? 'w-12 h-12' : 'w-20 h-20'}`}
                >
                  <Icon className={`${isMobile ? 'w-6 h-6' : 'w-10 h-10'} text-primary`} />
                </div>
                <div
                  className={`font-black text-white font-ethno ${isMobile ? 'text-sm' : 'text-xl'}`}
                >
                  {capability.label}
                </div>
                <div
                  className={`text-graylight font-medium font-kwajong ${isMobile ? 'text-xs' : 'text-sm'}`}
                >
                  {capability.description}
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Call to Action */}
        <motion.div
          className={`text-center ${isMobile ? 'space-y-3 pb-6' : 'space-y-8'}`}
          initial={{ opacity: 0, y: 50 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 2.5, duration: 0.8 }}
        >
          <div className={`${isMobile ? 'space-y-2' : 'space-y-4'}`}>
            <h3
              className={`font-black text-white font-mono ${isMobile ? 'text-base leading-tight' : 'text-2xl lg:text-4xl'}`}
            >
              NEED SOMETHING <span className="text-primary font-cyber">TOTALLY CUSTOM?</span>
            </h3>
            <p
              className={`text-graylight max-w-2xl mx-auto font-kwajong leading-relaxed ${isMobile ? 'text-xs px-2' : 'text-lg'}`}
            >
              Bring us your idea, measurements, or wildest performance dreams. We'll engineer and
              fabricate a one-off solution that's uniquely yours.
            </p>
            <div
              className={`font-borg text-accent tracking-widest ${isMobile ? 'text-xs' : 'text-sm'}`}
            >
              — BUILT TO YOUR EXACT SPECIFICATIONS —
            </div>
          </div>

          <div
            className={`flex justify-center ${isMobile ? 'flex-col gap-3 max-w-sm mx-auto' : 'flex-col sm:flex-row gap-4'}`}
          >
            <motion.div whileTap={{ scale: 0.98 }}>
              <Button
                asChild
                size={isMobile ? 'sm' : 'lg'}
                className={`group bg-gradient-to-r from-primary to-red-600 hover:from-primary/90 hover:to-red-700 text-white font-bold shadow-lg shadow-primary/25 metallic-btn font-ethno mobile-touch-target ${isMobile ? 'w-full px-6 py-3 text-sm' : 'px-8 py-4 text-lg'}`}
              >
                <a href="/customFab">
                  VIEW PORTFOLIO
                  <motion.div
                    className="ml-2"
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <ArrowRight className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
                  </motion.div>
                </a>
              </Button>
            </motion.div>

            <motion.div whileTap={{ scale: 0.98 }}>
              <Button
                size={isMobile ? 'sm' : 'lg'}
                variant="outline"
                className={`border-2 border-primary/30 text-primary hover:bg-primary hover:text-white font-bold backdrop-blur-sm industrial-glow font-ethno mobile-touch-target ${isMobile ? 'w-full px-6 py-3 text-sm' : 'px-8 py-4 text-lg'}`}
                asChild
              >
                <a href="/contact">CUSTOM QUOTE</a>
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default CustomFabrication;
