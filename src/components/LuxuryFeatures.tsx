import { motion, useInView } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { Zap, Award, Wrench } from 'lucide-react';
import { Badge } from './ui/badge';

export function LuxuryFeatures() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const premiumStats = [
    {
      number: '50+',
      label: 'Years Combined Experience',
      icon: Award
    },
    {
      number: '500+',
      label: 'Custom Builds Completed',
      icon: Wrench
    },
    {
      number: '1500+',
      label: 'Horsepower Achieved',
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
        className={`text-center group luxury-hover-scale ${isMobile ? 'p-4' : 'p-6'} luxury-glass rounded-2xl border border-luxury-gold/20`}
      >
        <Icon
          className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} text-primary mx-auto mb-2 group-hover:scale-110 transition-transform duration-300`}
        />
        <div
          className={`text-primary font-black font-cyber mb-1 ${isMobile ? 'text-lg' : 'text-3xl'}`}
        >
          {stat.number}
        </div>
        <div className={`text-graylight font-mono ${isMobile ? 'text-xs' : 'text-sm'}`}>
          {stat.label}
        </div>
      </motion.div>
    );
  };

  return (
    <section
      className={`relative ${isMobile ? 'py-8' : 'py-10'} asphalt-texture overflow-hidden border-rounded-lg border-black/70 shadow-box-inner shadow-outter shadow-white/20 border-rounded rounded-lg border-t `}
    >
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0 grunge-overlay"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/20 to-bg-[#1a1a1a]/40"></div>

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
            className={`bg-luxury-gold/10 border-luxury-gold/30 text-primaryB font-bold tracking-widest font-ethno luxury-gold-glow ${isMobile ? 'px-4 py-1 text-xs' : 'px-6 py-2 text-sm'}`}
          >
            PREMIUM EXCELLENCE
          </Badge>

          <h2
            className={`font-black leading-tight font-mono ${isMobile ? 'text-lg' : 'text-4xl lg:text-6xl'}`}
          >
            <span className="block text-primary font-borg">THE F.a.S.</span>
            <span className="text-white font-ethno">DIFFERENCE</span>
          </h2>

          <p
            className={`text-graylight max-w-3xl mx-auto font-mono font-bold ${isMobile ? 'text-xs leading-relaxed' : 'text-lg'}`}
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
              <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-thin">
                {premiumStats.map((stat, index) => (
                  <div key={index} className="snap-start flex-none w-[70%] max-w-xs">
                    <StatCard stat={stat} index={index} />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            className="grid gap-6 grid-cols-1 md:grid-cols-3 max-w-4xl mx-auto place-items-center"
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
            className={`luxury-glass rounded-2xl border border-luxury-gold/20 luxury-gold-glow max-w-2xl mx-auto ${isMobile ? 'p-6' : 'p-8'}`}
          >
            <h3
              className={`luxury-platinum-text font-bold font-cyber mb-3 ${isMobile ? 'text-base' : 'text-2xl'}`}
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
