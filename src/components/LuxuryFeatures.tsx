import { motion, useInView } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { Crown, Shield, Zap, Award, Wrench, Settings, Target, Clock } from 'lucide-react';
import { Badge } from './ui/badge';
import Button from '@/components/button';

export function LuxuryFeatures() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth <= 768);
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
  };

  const luxuryFeatures = [
    {
      icon: Crown,
      title: 'Bespoke Engineering',
      description: 'Custom-designed components using aerospace-grade materials.',
      highlights: ['CNC Machined', 'Hand-Finished', 'One-Off Design']
    },
    {
      icon: Shield,
      title: 'Lifetime Craftsmanship Warranty',
      description: 'Unmatched lifetime warranty on all custom components.',
      highlights: ['Lifetime Coverage', '24/7 Support', 'Quality Guarantee']
    },
    {
      icon: Target,
      title: 'Precision Performance',
      description: 'Dyno-tuned with real-world testing for optimal results.',
      highlights: ['Dyno Verified', 'Track Tested', 'Performance Proven']
    },
    {
      icon: Clock,
      title: 'White-Glove Service',
      description: 'Concierge-level service from consultation to completion.',
      highlights: ['Personal Consultant', 'Progress Updates', 'VIP Treatment']
    }
  ];

  const premiumStats = [
    { number: '50+', label: 'Years Experience', icon: Award },
    { number: '500+', label: 'Custom Builds', icon: Wrench },
    { number: '1000+', label: 'Horsepower Achieved', icon: Zap },
    { number: '100%', label: 'Client Satisfaction', icon: Crown }
  ];

  return (
    <section className="py-20 md:py-32 bg-background text-text" ref={ref}>
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          className="text-center space-y-4 md:space-y-6 mb-12 md:mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={variants}
        >
          <Badge className="bg-gray-800 text-gray-400 uppercase tracking-wider">
            Premium Excellence
          </Badge>
          <h2 className="text-3xl md:text-5xl font-bold">The F.A.S. Difference</h2>
          <p className="text-lg text-gray-400 max-w-3xl mx-auto">
            Experience automotive craftsmanship at its finest.
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 mb-12 md:mb-16"
          variants={variants}
        >
          {luxuryFeatures.map((feature, index) => (
            <motion.div
              key={index}
              className="bg-gray-900 border-gray-800 rounded-lg p-6"
              whileHover={{ scale: 1.02 }}
              variants={variants}
            >
              <feature.icon className="w-12 h-12 text-blue-400 mb-4" />
              <h3 className="text-xl font-medium mb-2">{feature.title}</h3>
              <p className="text-gray-400 mb-4">{feature.description}</p>
              <div className="flex flex-wrap gap-2">
                {feature.highlights.map((highlight, hIndex) => (
                  <Badge key={hIndex} variant="secondary" className="bg-gray-800 text-gray-300">
                    {highlight}
                  </Badge>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Stats Grid */}
        <motion.div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8" variants={variants}>
          {premiumStats.map((stat, index) => (
            <div key={index} className="text-center">
              <stat.icon className="w-12 h-12 text-blue-400 mx-auto mb-4" />
              <h3 className="text-3xl font-bold text-blue-400">{stat.number}</h3>
              <p className="text-sm text-gray-400 uppercase">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div className="text-center mt-12" variants={variants}>
          <Button
            href="#"
            text="Schedule Consultation"
            onClick={() => {
              /* handle click here */
            }}
            className="bg-blue-600 hover:bg-blue-700 rounded-full"
          >
            Schedule Consultation
          </Button>
        </motion.div>
      </div>
    </section>
  );
}

export default LuxuryFeatures;
