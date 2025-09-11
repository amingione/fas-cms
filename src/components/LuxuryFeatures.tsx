import { motion, useInView } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { Crown, Shield, Zap, Award, Wrench, Settings, Target, Clock } from 'lucide-react';
import { Badge } from './ui/badge';

export function LuxuryFeatures() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });
  const [isMobile, setIsMobile] = useState(false);
  const statsTrackRef = useRef<HTMLDivElement | null>(null);
  const statsInnerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-scroll the mobile stats carousel; duplicate items for a seamless loop
  useEffect(() => {
    if (!isMobile) return;
    const track = statsTrackRef.current;
    const inner = statsInnerRef.current;
    if (!track || !inner) return;
    let raf = 0;
    const speed = 0.7; // px per frame
    const tick = () => {
      try {
        track.scrollLeft += speed;
        // Loop at the halfway point since we render items twice in one row
        const w = inner.scrollWidth / 2;
        if (w > 0 && track.scrollLeft >= w) {
          track.scrollLeft -= w; // reset seamlessly to the first copy
        }
      } finally {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isMobile]);

  const luxuryFeatures = [
    {
      icon: Crown,
      title: 'Bespoke Engineering',
      description:
        'Every component is custom-designed and manufactured to your exact specifications using aerospace-grade materials.',
      gradient: 'from-luxury-gold/20 to-yellow-600/20',
      glow: 'luxury-gold-glow'
    },
    {
      icon: Shield,
      title: 'Lifetime Craftsmanship Warranty',
      description:
        'We stand behind our work with an unmatched lifetime warranty on all custom fabricated components.',
      gradient: 'from-luxury-platinum/20 to-gray-400/20',
      glow: 'luxury-platinum-glow'
    },
    {
      icon: Target,
      title: 'Precision Performance',
      description:
        'Dyno-tuned to perfection with real-world testing to ensure every build exceeds expectations.',
      gradient: 'from-primary/20 to-red-600/20',
      glow: 'industrial-glow'
    }
  ];

  const premiumStats = [
    {
      number: '20+',
      label: 'Years Experience',
      icon: Award
    },
    {
      number: '500+',
      label: 'Custom Builds',
      icon: Wrench
    },
    {
      number: '1000+',
      label: 'Horsepower Packages',
      icon: Zap
    }
  ];

  const StatCard = ({ stat, index }: { stat: any; index: number }) => {
    const Icon = stat.icon;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={isInView ? { opacity: 1, scale: 1 } : {}}
        transition={{ delay: 0.8 + index * 0.1, duration: 0.6 }}
        className={`text-center group ${!isMobile ? 'luxury-hover-scale' : ''} ${isMobile ? 'p-4' : 'p-6'} luxury-glass rounded-2xl border border-luxury-gold/20`}
      >
        <Icon
          className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} text-luxury-gold mx-auto mb-2 group-hover:scale-110 transition-transform duration-300`}
        />
        <div
          className={`luxury-gold-text font-black font-cyber mb-1 ${isMobile ? 'text-lg' : 'text-3xl'}`}
        >
          {stat.number}
        </div>
        <div className={`text-graylight font-kwajong ${isMobile ? 'text-xs' : 'text-sm'}`}>
          {stat.label}
        </div>
      </motion.div>
    );
  };

  return (
    <section className={`relative ${isMobile ? 'py-8' : 'py-20'} asphalt-texture overflow-hidden`}>
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0 grunge-overlay"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/70 to-black/90"></div>

      {/* Luxury Particle Effects */}
      {!isMobile && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute"
              style={{
                left: `${5 + i * 12}%`,
                top: `${10 + (i % 4) * 20}%`,
                width: '3px',
                height: '3px'
              }}
              animate={{
                opacity: [0.2, 0.8, 0.2],
                scale: [1, 2, 1],
                backgroundColor: ['#d4af37', '#ffffff', '#e5e4e2', '#d4af37']
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                delay: i * 0.8,
                ease: 'easeInOut'
              }}
            >
              <div className="w-full h-full rounded-full luxury-gold-glow"></div>
            </motion.div>
          ))}
        </div>
      )}

      <div
        className={`mx-auto relative z-10 ${isMobile ? 'px-4' : 'container px-6 lg:px-8'}`}
        ref={ref}
      >
        {/* Section Header */}
        <motion.div
          className={`text-center ${isMobile ? 'mb-6 space-y-3' : 'mb-16 space-y-6'}`}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          <Badge
            variant="outline"
            className={`bg-luxury-gold/10 border-luxury-gold/30 text-luxury-gold font-bold tracking-widest font-ethno luxury-gold-glow ${isMobile ? 'px-4 py-1 text-xs' : 'px-6 py-2 text-sm'}`}
          >
            PREMIUM EXCELLENCE
          </Badge>

          <h2
            className={`font-black leading-tight font-mono ${isMobile ? 'text-lg' : 'text-4xl lg:text-6xl'}`}
          >
            <span className="block text-white font-borg">THE F.a.S.</span>
            <span className="block luxury-gold-text font-ethno">DIFFERENCE</span>
          </h2>

          <p
            className={`text-graylight max-w-3xl mx-auto font-mono ${isMobile ? 'text-xs leading-relaxed' : 'text-lg'}`}
          >
            Experience the pinnacle of automotive craftsmanship with our exclusive luxury services
            and uncompromising attention to detail.
          </p>
        </motion.div>

        {/* Premium Stats: carousel on mobile, grid on desktop */}
        {isMobile ? (
          <motion.div
            className="mb-12"
            initial={{ opacity: 0, y: 50 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            <div className="-mx-4 px-4">
              <div
                ref={statsTrackRef}
                className="overflow-x-auto overflow-y-hidden scrollbar-thin py-1"
              >
                <div ref={statsInnerRef} className="flex flex-nowrap gap-5">
                  {[...premiumStats, ...premiumStats].map((stat, index) => (
                    <div
                      key={`stat-${index}`}
                      className="flex-none w-[76%] min-w-[260px] max-w-xs px-1"
                    >
                      <StatCard stat={stat} index={index % premiumStats.length} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            className="grid gap-4 grid-cols-3 max-w-6xl mx-auto justify-items-center"
            initial={{ opacity: 0, y: 50 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            {premiumStats.map((stat, index) => (
              <StatCard key={index} stat={stat} index={index} />
            ))}
          </motion.div>
        )}

        {/* Premium CTA */}
        <motion.div
          className={`text-center ${isMobile ? 'mt-8' : 'mt-16'}`}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 1.2, duration: 0.8 }}
        >
          <div
            className={`bg-black drop-shadow-lg rounded-2xl border border-primary luxury-gold-glow max-w-2xl mx-auto ${isMobile ? 'p-6' : 'p-8'}`}
          >
            <h3
              className={`luxury-platinum-text text-red/50 font-bold font-cyber mb-3 ${isMobile ? 'text-base' : 'text-2xl'}`}
            >
              READY FOR THE ULTIMATE BUILD?
            </h3>
            <p className={`text-graylight font-mono mb-6 ${isMobile ? 'text-xs' : 'text-lg'}`}>
              Join the elite circle of F.A.S. Motorsports clients and experience automotive
              perfection.
            </p>
            <motion.a
              href="/schedule"
              className={`inline-block luxury-btn text-white font-bold transition-all duration-300 rounded-xl font-ethno ${isMobile ? 'px-6 py-3 text-sm' : 'px-10 py-4 text-lg'}`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              SCHEDULE CONSULTATION
            </motion.a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default LuxuryFeatures;
