import { motion, useInView } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { Crown, Shield, Zap, Award, Wrench, Settings, Target, Clock } from 'lucide-react';
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

  const luxuryFeatures = [
    {
      icon: Crown,
      title: 'Bespoke Engineering',
      description:
        'Every component is custom-designed and manufactured to your exact specifications using aerospace-grade materials.',
      highlights: ['CNC Machined', 'Hand-Finished', 'One-Off Design'],
      gradient: 'from-luxury-gold/20 to-yellow-600/20',
      glow: 'luxury-gold-glow'
    },
    {
      icon: Shield,
      title: 'Lifetime Craftsmanship Warranty',
      description:
        'We stand behind our work with an unmatched lifetime warranty on all custom fabricated components.',
      highlights: ['Lifetime Coverage', '24/7 Support', 'Quality Guarantee'],
      gradient: 'from-luxury-platinum/20 to-gray-400/20',
      glow: 'luxury-platinum-glow'
    },
    {
      icon: Target,
      title: 'Precision Performance',
      description:
        'Dyno-tuned to perfection with real-world testing to ensure every build exceeds expectations.',
      highlights: ['Dyno Verified', 'Track Tested', 'Performance Proven'],
      gradient: 'from-primary/20 to-red-600/20',
      glow: 'industrial-glow'
    },
    {
      icon: Clock,
      title: 'White-Glove Service',
      description:
        'From consultation to completion, experience concierge-level service throughout your build journey.',
      highlights: ['Personal Consultant', 'Progress Updates', 'VIP Treatment'],
      gradient: 'from-luxury-bronze/20 to-orange-600/20',
      glow: 'luxury-gold-glow'
    }
  ];

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
      number: '1000+',
      label: 'Horsepower Achieved',
      icon: Zap
    },
    {
      number: '100%',
      label: 'Client Satisfaction',
      icon: Crown
    }
  ];

  const FeatureCard = ({ feature, index }: { feature: any; index: number }) => {
    const Icon = feature.icon;
    return (
      <motion.div
        initial={{ opacity: 0, y: 50, rotateX: 10 }}
        animate={isInView ? { opacity: 1, y: 0, rotateX: 0 } : {}}
        transition={{ delay: 0.2 + index * 0.15, duration: 0.8 }}
        className={`relative luxury-glass luxury-hover-scale ${feature.glow} ${isMobile ? 'p-4' : 'p-6'} rounded-2xl border border-gray-700/50 luxury-float`}
        style={{ perspective: '1000px' }}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 luxury-carbon-effect rounded-2xl opacity-30"></div>

        <div className="relative z-10">
          {/* Icon */}
          <div
            className={`bg-gradient-to-br ${feature.gradient} rounded-xl flex items-center justify-center mb-4 border border-gray-600/30 ${isMobile ? 'w-12 h-12' : 'w-16 h-16'}`}
          >
            <Icon className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} text-white`} />
          </div>

          {/* Title */}
          <h3
            className={`font-black text-white font-ethno mb-3 ${isMobile ? 'text-sm' : 'text-xl'}`}
          >
            {feature.title}
          </h3>

          {/* Description */}
          <p
            className={`text-graylight leading-relaxed font-kwajong mb-4 ${isMobile ? 'text-xs' : 'text-sm'}`}
          >
            {feature.description}
          </p>

          {/* Highlights */}
          <div className="flex flex-wrap gap-2">
            {feature.highlights.map((highlight: string, idx: number) => (
              <Badge
                key={idx}
                variant="outline"
                className={`bg-gray-800/50 text-luxury-gold border border-luxury-gold/30 font-ethno ${isMobile ? 'text-xs px-2 py-0.5' : 'text-xs'}`}
              >
                {highlight}
              </Badge>
            ))}
          </div>
        </div>
      </motion.div>
    );
  };

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
            className={`font-black leading-tight font-captain ${isMobile ? 'text-lg' : 'text-4xl lg:text-6xl'}`}
          >
            <span className="block text-white">THE F.A.S.</span>
            <span className="block luxury-gold-text font-cyber">DIFFERENCE</span>
          </h2>

          <p
            className={`text-graylight max-w-3xl mx-auto font-kwajong ${isMobile ? 'text-xs leading-relaxed' : 'text-lg'}`}
          >
            Experience the pinnacle of automotive craftsmanship with our exclusive luxury services
            and uncompromising attention to detail.
          </p>
        </motion.div>

        {/* Features Grid */}
        <div
          className={`grid gap-6 mb-16 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'}`}
        >
          {luxuryFeatures.map((feature, index) => (
            <FeatureCard key={index} feature={feature} index={index} />
          ))}
        </div>

        {/* Premium Stats */}
        <motion.div
          className={`grid gap-4 ${isMobile ? 'grid-cols-2 max-w-sm mx-auto' : 'grid-cols-4 max-w-6xl mx-auto'}`}
          initial={{ opacity: 0, y: 50 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.6, duration: 0.8 }}
        >
          {premiumStats.map((stat, index) => (
            <StatCard key={index} stat={stat} index={index} />
          ))}
        </motion.div>

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
            <p className={`text-graylight font-kwajong mb-6 ${isMobile ? 'text-xs' : 'text-lg'}`}>
              Join the elite circle of F.A.S. Motorsports clients and experience automotive
              perfection.
            </p>
            <motion.button
              className={`luxury-btn text-white font-bold transition-all duration-300 rounded-xl font-ethno ${isMobile ? 'px-6 py-3 text-sm' : 'px-10 py-4 text-lg'}`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              SCHEDULE CONSULTATION
            </motion.button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
