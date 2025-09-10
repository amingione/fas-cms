import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Shield, ShieldCheck, Lock, CheckCircle, Star, Calendar, ArrowRight } from 'lucide-react';
import { motion, useInView } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';

export function IGLASecurity() {
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

  const certifications = [
    { label: 'Certified Installer', sublabel: '' },
    { label: '#1 in SWFL', sublabel: 'Volume' },
    { label: 'Expert', sublabel: 'Technicians' }
  ];

  const keyFeatures = [
    {
      icon: Shield,
      title: 'Undetectable Installation',
      description: 'Seamless integration with no visible components.'
    },
    {
      icon: Lock,
      title: 'Encrypted Communication',
      description: 'Military-grade 128-bit AES encryption.'
    },
    {
      icon: ShieldCheck,
      title: 'Ghost Immobilization',
      description: 'Adaptive algorithms to prevent bypass attempts.'
    },
    {
      icon: CheckCircle,
      title: 'Zero Maintenance',
      description: 'Self-monitoring system with lifetime reliability.'
    }
  ];

  const securityFeatures = [
    '128-bit AES Military Encryption',
    'Anti-Scan & Anti-Grab Technology',
    'Smartphone App Integration',
    'GPS Tracking Compatibility',
    'Professional Installation Only',
    'Lifetime Warranty Coverage'
  ];

  return (
    <section
      id="igla-security"
      className="py-20 md:py-32 bg-gradient-to-br from-background to-gray-900 relative overflow-hidden"
    >
      <div className="absolute inset-0 grain-overlay opacity-10" />
      <div className="container mx-auto px-4 md:px-6 relative z-10" ref={ref}>
        <motion.div
          className="text-center space-y-6 md:space-y-8 mb-12 md:mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={variants}
        >
          <Badge className="bg-gray-800/50 backdrop-blur-sm text-blue-400 uppercase tracking-widest">
            #1 IGLA Installer in SWFL
          </Badge>
          <h2 className="text-4xl md:text-6xl font-display font-bold text-text">
            Unbreakable Vehicle Security
          </h2>
          <p className="text-lg md:text-2xl text-gray-400 max-w-3xl mx-auto">
            Fortify your vehicle with cutting-edge anti-theft technology.
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8 mb-12 md:mb-16"
          variants={variants}
        >
          {certifications.map((cert, index) => (
            <motion.div
              key={index}
              className="text-center"
              whileHover={{ scale: 1.05, y: -5 }}
              variants={variants}
            >
              <motion.div
                className="w-20 h-20 rounded-full bg-gray-800/50 backdrop-blur-sm flex items-center justify-center mx-auto mb-4"
                whileHover={{ boxShadow: '0 0 15px rgba(59,130,246,0.4)' }}
              >
                <Star className="w-10 h-10 text-blue-400" />
              </motion.div>
              <h4 className="text-lg md:text-xl font-medium text-text mb-2">{cert.label}</h4>
              <p className="text-sm md:text-base text-gray-400">{cert.sublabel}</p>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 mb-12 md:mb-16"
          variants={variants}
        >
          {keyFeatures.map((feature, index) => (
            <motion.div
              key={index}
              whileHover={{ scale: 1.03, boxShadow: '0 0 20px rgba(59,130,246,0.3)' }}
              variants={variants}
            >
              <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-800 h-full rounded-xl">
                <CardHeader className="flex flex-row items-center space-x-4 p-6">
                  <motion.div
                    className="w-12 h-12 rounded-full bg-gray-800/50 flex items-center justify-center"
                    whileHover={{ scale: 1.1, backgroundColor: 'rgba(59,130,246,0.2)' }}
                  >
                    <feature.icon className="w-6 h-6 text-blue-400" />
                  </motion.div>
                  <CardTitle className="text-xl md:text-2xl font-medium text-text">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-gray-400">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        <motion.div className="max-w-3xl mx-auto mb-12 md:mb-16" variants={variants}>
          <h3 className="text-2xl md:text-3xl font-medium text-text mb-6 text-center">
            Protection Matrix
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {securityFeatures.map((feature, index) => (
              <motion.div
                key={index}
                className="flex items-center space-x-3 text-gray-400"
                whileHover={{ x: 5 }}
                variants={variants}
              >
                <CheckCircle className="h-5 w-5 text-blue-400" />
                <span>{feature}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="text-center space-y-6"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={variants}
        >
          <h3 className="text-3xl md:text-4xl font-display font-bold text-text">
            Secure Your Vehicle Today
          </h3>
          <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto">
            Our certified technicians deliver precision installations tailored to your vehicle.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button
              size={isMobile ? 'md' : 'lg'}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full shadow-[0_0_15px_rgba(59,130,246,0.4)] hover:shadow-[0_0_25px_rgba(59,130,246,0.6)] transition-all"
            >
              <Calendar className="mr-2 h-5 w-5" />
              Schedule Consultation
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size={isMobile ? 'md' : 'lg'}
              variant="outline"
              className="border-blue-600 text-blue-400 hover:bg-blue-600/10 rounded-full"
            >
              Request Quote
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default IGLASecurity;
