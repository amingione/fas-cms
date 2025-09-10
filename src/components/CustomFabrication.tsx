import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ArrowRight, ArrowLeft, Flame, Wrench, Gauge, Settings, Award } from 'lucide-react';
import { motion, useInView } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';

export function CustomFabrication() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth <= 640);
    const handleResize = () => setIsMobile(window.innerWidth <= 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const variants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: 'easeOut' } }
  };

  const fabricationServices = [
    {
      icon: Flame,
      title: 'Turbo & Supercharger Kits',
      description: 'High-performance forced induction systems for maximum power.',
      features: ['Custom Piping', 'Heat Management', 'ECU Tuning', 'Dyno Testing']
    },
    {
      icon: Wrench,
      title: 'Exhaust Systems',
      description: 'Crafted for optimal flow and aggressive sound.',
      features: ['Stainless Steel', 'Custom Routing', 'Sound Tuning', 'Headers']
    },
    {
      icon: Gauge,
      title: 'Complete Builds',
      description: 'Bespoke vehicle transformations from the ground up.',
      features: ['Engine Swaps', 'Suspension', 'Roll Cages', 'Interior Work']
    }
  ];

  const capabilities = [
    { icon: Flame, label: 'TIG Welding', description: 'Precision aluminum & steel' },
    { icon: Settings, label: 'CNC Machining', description: 'Custom billet components' },
    { icon: Gauge, label: 'Dyno Tuning', description: 'Performance optimization' },
    { icon: Award, label: 'R&D Testing', description: 'Proven reliability' }
  ];

  // Marquee refs for capabilities loop
  const marqueeRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    let rafId = 0;
    let x = 0;
    const speed = 0.5; // px per frame

    const tick = () => {
      const track = marqueeRef.current;
      const inner = contentRef.current;
      if (!track || !inner) {
        rafId = requestAnimationFrame(tick);
        return;
      }
      x -= speed;
      const width = inner.getBoundingClientRect().width;
      if (-x >= width) x = 0; // loop seamlessly after one copy width
      track.style.transform = `translateX(${x}px)`;
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [capabilities.length]);

  return (
    <section
      id="customfabrication"
      className="py-20 md:py-32 bg-gradient-to-br from-background to-gray-900 relative overflow-hidden"
    >
      <div className="absolute inset-0 grain-overlay opacity-10" />
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <motion.div
          className="text-center space-y-6 md:space-y-8 mb-12 md:mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={variants}
        >
          <Badge className="bg-gray-800/50 backdrop-blur-sm text-blue-400 uppercase tracking-widest">
            Custom Fabrication
          </Badge>
          <h2 className="text-4xl md:text-6xl font-display font-bold text-text">
            Craft Your Vision
          </h2>
          <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto">
            From bold concepts to flawless execution, we build performance masterpieces tailored to
            you.
          </p>
        </motion.div>

        <motion.div
          className="relative mb-12 md:mb-16"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
        >
          <div className="grid grid-cols-2 gap-4 items-center">
            <img
              src="/images/fabrication/custom-fab-2.png"
              alt="Custom Fabricated Performance Parts"
              className="w-full h-40 sm:h-56 md:h-96 object-contain rounded-lg shadow-[0_0_30px_rgba(59,130,246,0.3)]"
            />
            <img
              src="/images/fabrication/FAS-Fabrication-1.png"
              alt="Custom Fabricated Exhaust System"
              className="w-full h-40 sm:h-56 md:h-96 object-contain rounded-lg shadow-[0_0_30px_rgba(59,130,246,0.3)]"
            />
          </div>
          <motion.div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/80 to-transparent"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 1 }}
          />
        </motion.div>

        <motion.div className="relative mb-12 md:mb-16" variants={variants}>
          <div ref={ref} className="flex gap-4 overflow-x-auto snap-x snap-mandatory px-1">
            {fabricationServices.map((service, index) => (
              <motion.div
                key={index}
                className="snap-start flex-none w-[20rem] sm:w-[24rem] md:w-[26rem]"
                whileHover={{ scale: 1.03, boxShadow: '0 0 20px rgba(59,130,246,0.3)' }}
                variants={variants}
              >
                <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-800 h-full rounded-xl">
                  <CardHeader className="flex flex-row items-center space-x-4 p-6">
                    <motion.div
                      className="w-12 h-12 rounded-full bg-gray-800/50 flex items-center justify-center"
                      whileHover={{ scale: 1.1, backgroundColor: 'rgba(59,130,246,0.2)' }}
                    >
                      <service.icon className="w-6 h-6 text-blue-400" />
                    </motion.div>
                    <CardTitle className="text-xl md:text-2xl font-medium text-text">
                      {service.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <p className="text-gray-400">{service.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {service.features.map((feature, fIndex) => (
                        <Badge
                          key={fIndex}
                          className="bg-gray-800/50 text-gray-300 border-gray-700"
                        >
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
          {/* Carousel controls */}
          <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center justify-between px-1">
            <button
              type="button"
              aria-label="Previous"
              onClick={() => {
                const el = ref.current as unknown as HTMLElement | null;
                if (el)
                  el.scrollBy({ left: -Math.round(el.clientWidth * 0.8), behavior: 'smooth' });
              }}
              className="pointer-events-auto inline-flex items-center justify-center w-9 h-9 rounded-full border border-white/10 text-white shadow"
            >
              <ArrowLeft className="w-2 h-2" />
            </button>
            <button
              type="button"
              aria-label="Next"
              onClick={() => {
                const el = ref.current as unknown as HTMLElement | null;
                if (el) el.scrollBy({ left: Math.round(el.clientWidth * 0.8), behavior: 'smooth' });
              }}
              className="pointer-events-auto inline-flex items-center justify-center w-9 h-9 rounded-full bg-black/60 border border-white/10 text-white hover:bg-black/80 shadow"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </motion.div>

        {/* Infinite carousel for capabilities */}
        <div className="relative mb-12 md:mb-16 overflow-hidden">
          <div
            ref={marqueeRef}
            className="flex items-center gap-8 pr-8 will-change-transform"
            style={{ transform: 'translateX(0)' }}
          >
            <div ref={contentRef} className="flex items-center gap-8 pr-8">
              {capabilities.map((cap, index) => (
                <div key={`cap-a-${index}`} className="text-center min-w-[12rem]">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gray-800/50 backdrop-blur-sm flex items-center justify-center mx-auto mb-3 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                    <cap.icon className="w-8 h-8 md:w-10 md:h-10 text-blue-400" />
                  </div>
                  <h4 className="text-base md:text-lg font-medium text-text">{cap.label}</h4>
                  <p className="text-xs md:text-sm text-gray-400 mt-1">{cap.description}</p>
                </div>
              ))}
            </div>
            {/* Duplicate group for seamless loop */}
            <div className="flex items-center gap-8 pr-8" aria-hidden="true">
              {capabilities.map((cap, index) => (
                <div key={`cap-b-${index}`} className="text-center min-w-[12rem]">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gray-800/50 backdrop-blur-sm flex items-center justify-center mx-auto mb-3 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                    <cap.icon className="w-8 h-8 md:w-10 md:h-10 text-blue-400" />
                  </div>
                  <h4 className="text-base md:text-lg font-medium text-text">{cap.label}</h4>
                  <p className="text-xs md:text-sm text-gray-400 mt-1">{cap.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <motion.div
          className="text-center space-y-6"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={variants}
        >
          <h3 className="text-3xl md:text-4xl font-display font-bold text-text">
            Dream It. Build It.
          </h3>
          <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto">
            Your vision, our expertise. Let’s create something extraordinary.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button
              size={isMobile ? 'md' : 'lg'}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full shadow-[0_0_15px_rgba(59,130,246,0.4)] hover:shadow-[0_0_25px_rgba(59,130,246,0.6)] transition-all"
            >
              View Portfolio
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size={isMobile ? 'md' : 'lg'}
              variant="outline"
              className="border-blue-600 text-blue-400 hover:bg-blue-600/10 rounded-full"
            >
              Get Custom Quote
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default CustomFabrication;
