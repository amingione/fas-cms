import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import Button from '@/components/button';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  ShieldCheck,
  Lock,
  CheckCircle,
  Star,
  Calendar,
  ArrowRight,
  Award
} from 'lucide-react';
import { motion, useInView } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';

export function IGLASecurity() {
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

  const certifications = [
    { label: 'CERTIFIED', sublabel: 'INSTALLER' },
    { label: '#1 IN SWFL', sublabel: 'VOLUME' },
    { label: 'EXPERT', sublabel: 'TECHNICIANS' }
  ];

  const keyFeatures = [
    {
      icon: Shield,
      title: 'Undetectable Installation',
      description:
        'Completely invisible integration with factory systems - no visible wires or components.'
    },
    {
      icon: Lock,
      title: 'Encrypted Communication',
      description: 'Military-grade 128-bit AES encryption prevents signal interception and cloning.'
    },
    {
      icon: ShieldCheck,
      title: 'Ghost Immobilization',
      description:
        'Advanced algorithms create unpredictable patterns that adapt to defeat bypass attempts.'
    },
    {
      icon: CheckCircle,
      title: 'Zero Maintenance',
      description:
        'Self-monitoring system with lifetime reliability - no batteries or periodic updates required.'
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
      className={`relative overflow-hidden ${isMobile ? 'py-8' : 'py-32'}`}
    >
      {/* Premium gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-black-950 via-black-900 to-black"></div>

      {/* Sophisticated texture overlay */}
      <div className="absolute inset-0 grunge-overlay opacity-30"></div>

      {/* Subtle animated elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 30}%`,
              width: '1px',
              height: '30px'
            }}
            animate={{
              opacity: [0.1, 0.3, 0.1],
              scaleY: [0.8, 1.2, 0.8]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              delay: i * 0.8,
              ease: 'easeInOut'
            }}
          >
            <div className="w-full h-full bg-gradient-to-b from-transparent via-slate-400/40 to-transparent"></div>
          </motion.div>
        ))}
      </div>

      <div
        className={`relative z-10 ${isMobile ? 'w-full px-4' : 'container mx-auto px-6 lg:px-8'}`}
        ref={ref}
      >
        {/* Elegant Header */}
        <motion.div
          className={`text-center ${isMobile ? 'space-y-6 mb-8' : 'space-y-12 mb-24'}`}
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1, ease: 'easeOut' }}
        >
          {/* Certification badges */}
          <motion.div
            className={`flex flex-wrap justify-center ${isMobile ? 'gap-3' : 'gap-6'}`}
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            {certifications.map((cert, index) => (
              <div key={index} className="text-center">
                <div
                  className={`mx-auto mb-2 rounded-full bg-black/50 border border-slate-600/50 flex items-center justify-center backdrop-blur-sm industrial-card ${isMobile ? 'w-12 h-12' : 'w-20 h-20'}`}
                >
                  <Star className={`text-slate-300 ${isMobile ? 'w-5 h-5' : 'w-8 h-8'}`} />
                </div>
                <div
                  className={`font-bold text-slate-300 tracking-wider font-ethno ${isMobile ? 'text-xs' : 'text-sm'}`}
                >
                  {cert.label}
                </div>
                <div
                  className={`text-slate-500 tracking-widest font-ethno ${isMobile ? 'text-xs' : 'text-xs'}`}
                >
                  {cert.sublabel}
                </div>
              </div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            <Badge
              variant="outline"
              className={`bg-black/50 border-slate-600/50 text-slate-300 font-medium tracking-[0.2em] backdrop-blur-sm industrial-card font-ethno ${isMobile ? 'px-4 py-2 text-xs' : 'px-8 py-3 text-sm'}`}
            >
              #1 IGLA INSTALLER IN SWFL
            </Badge>
          </motion.div>

          <motion.h2
            className={`font-light leading-tight tracking-tight ${isMobile ? 'text-lg' : 'text-4xl lg:text-7xl'}`}
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.7, duration: 1 }}
          >
            <span
              className={`block text-slate-200 font-extralight font-kwajong ${isMobile ? 'text-sm' : ''}`}
            >
              ADVANCED
            </span>
            <span
              className={`block text-white font-bold font-captain ${isMobile ? 'text-base my-1' : 'text-5xl lg:text-8xl my-2'}`}
            >
              VEHICLE
            </span>
            <span className={`block chrome-text font-cyber ${isMobile ? 'text-sm' : ''}`}>
              PROTECTION
            </span>
          </motion.h2>

          <motion.div
            className={`mx-auto ${isMobile ? 'space-y-3' : 'max-w-4xl space-y-6'}`}
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.9, duration: 0.8 }}
          >
            <h3
              className={`font-light text-slate-300 tracking-wide font-ethno ${isMobile ? 'text-sm' : 'text-2xl lg:text-3xl'}`}
            >
              IGLA ANTI-THEFT SYSTEM
            </h3>
            <p
              className={`text-slate-400 leading-relaxed font-light mx-auto font-kwajong ${isMobile ? 'text-xs max-w-full' : 'text-lg max-w-3xl'}`}
            >
              The pinnacle of vehicle security technology. Unlike traditional immobilizers that can
              be bypassed, IGLA employs military-grade encrypted communication and advanced
              algorithms to ensure absolute protection.
            </p>
            <div
              className={`font-borg text-accent tracking-widest ${isMobile ? 'text-xs' : 'text-sm'}`}
            >
              — UNBREAKABLE • UNDETECTABLE • UNSTOPPABLE —
            </div>
          </motion.div>
        </motion.div>

        <div
          className={`grid items-center ${isMobile ? 'grid-cols-1 gap-6 mb-8' : 'lg:grid-cols-2 gap-20 mb-32'}`}
        >
          {/* Premium Product Showcase */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, x: -50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 1.2, duration: 1 }}
          >
            <div className="relative">
              {/* Elegant frame with texture */}
              <div className="absolute -inset-8 bg-black/40 rounded-3xl backdrop-blur-sm border border-slate-700/50 industrial-card"></div>

              {/* Product image */}
              <motion.div
                className="relative z-10"
                whileHover={{ scale: 1.01 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              >
                <img
                  src="/images/igla-page-trackhwak.webp"
                  alt="IGLA Anti-Theft System - Premium Vehicle Protection"
                  className="w-full h-auto rounded-2xl shadow-2xl"
                />
              </motion.div>

              {/* Premium indicators */}
              <motion.div
                className={`absolute bg-black/80 rounded-2xl backdrop-blur-sm border border-slate-700/50 industrial-card ${isMobile ? 'top-2 right-2 p-2' : 'top-6 right-6 p-4'}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: 1.8, duration: 0.6 }}
              >
                <ShieldCheck
                  className={`text-emerald-400 ${isMobile ? 'w-4 h-4 mb-1' : 'w-6 h-6 mb-2'}`}
                />
                <div
                  className={`font-medium text-slate-300 font-ethno ${isMobile ? 'text-xs' : 'text-xs'}`}
                >
                  SECURED
                </div>
              </motion.div>

              <motion.div
                className={`absolute bg-black/80 rounded-2xl backdrop-blur-sm border border-slate-700/50 industrial-card ${isMobile ? 'bottom-2 left-2 p-2' : 'bottom-6 left-6 p-4'}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: 2, duration: 0.6 }}
              >
                <div
                  className={`font-bold text-white font-cyber ${isMobile ? 'text-lg' : 'text-2xl'}`}
                >
                  100%
                </div>
                <div
                  className={`font-medium text-slate-400 font-ethno ${isMobile ? 'text-xs' : 'text-xs'}`}
                >
                  PROTECTION
                </div>
              </motion.div>

              {/* Subtle accent effects */}
              <div className="absolute -top-2 -right-2 w-24 h-24 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-2xl"></div>
              <div className="absolute -bottom-2 -left-2 w-16 h-16 bg-gradient-to-br from-slate-300/10 to-transparent rounded-full blur-xl"></div>
            </div>
          </motion.div>

          {/* Refined Features */}
          <motion.div
            className={`${isMobile ? 'space-y-4' : 'space-y-8'}`}
            initial={{ opacity: 0, x: 50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 1.4, duration: 1 }}
          >
            <div className={`${isMobile ? 'space-y-3' : 'space-y-6'}`}>
              <motion.h3
                className={`font-light text-white tracking-wide font-kwajong ${isMobile ? 'text-lg' : 'text-3xl'}`}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 1.6, duration: 0.8 }}
              >
                Premium Security <span className="font-bold font-ethno">FEATURES</span>
              </motion.h3>

              <div className={`grid ${isMobile ? 'gap-3' : 'gap-6'}`}>
                {keyFeatures.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={isInView ? { opacity: 1, y: 0 } : {}}
                      transition={{ delay: 1.8 + index * 0.15, duration: 0.6 }}
                      whileHover={!isMobile ? { x: 8 } : {}}
                      className="group cursor-pointer"
                    >
                      <Card className="border-slate-700/50 hover:border-slate-600/70 transition-all duration-700 bg-black/40 backdrop-blur-sm hover:bg-black/60 industrial-card">
                        <CardHeader
                          className={`flex items-center space-y-0 ${isMobile ? 'flex-col space-y-2 p-3' : 'flex-row space-x-6 pb-3'}`}
                        >
                          <div
                            className={`bg-black/60 rounded-xl flex items-center justify-center border border-slate-600/50 group-hover:border-slate-500/70 transition-all duration-500 industrial-card ${isMobile ? 'w-8 h-8' : 'w-12 h-12'}`}
                          >
                            <Icon
                              className={`text-slate-300 group-hover:text-white transition-colors duration-500 ${isMobile ? 'w-4 h-4' : 'w-6 h-6'}`}
                            />
                          </div>
                          <div className={`${isMobile ? 'text-center' : 'flex-1'}`}>
                            <CardTitle
                              className={`group-hover:text-white transition-colors duration-500 text-slate-200 font-medium font-ethno ${isMobile ? 'text-sm' : 'text-lg'}`}
                            >
                              {feature.title}
                            </CardTitle>
                            <CardDescription
                              className={`text-slate-400 font-light font-kwajong ${isMobile ? 'text-xs mt-1' : 'mt-1'}`}
                            >
                              {feature.description}
                            </CardDescription>
                          </div>
                        </CardHeader>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Elegant Technology Details */}
        <motion.div
          className={`bg-black/50 backdrop-blur-xl rounded-3xl border border-slate-700/50 industrial-card ${isMobile ? 'p-4 mb-8' : 'p-12 lg:p-16 mb-32'}`}
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 2.2, duration: 1 }}
        >
          <div className={`grid ${isMobile ? 'grid-cols-1 gap-6' : 'lg:grid-cols-3 gap-16'}`}>
            <div className={`${isMobile ? 'space-y-4' : 'lg:col-span-2 space-y-8'}`}>
              <motion.h3
                className={`font-light text-white leading-tight font-captain ${isMobile ? 'text-lg' : 'text-3xl lg:text-4xl'}`}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 2.4, duration: 0.8 }}
              >
                UNIQUE DIGITAL{' '}
                <span className="font-bold chrome-text font-cyber">ANTI-THEFT SYSTEM</span>
              </motion.h3>

              <motion.div
                className={`text-slate-400 leading-relaxed font-light ${isMobile ? 'space-y-3' : 'space-y-6'}`}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 2.6, duration: 0.8 }}
              >
                <p className={`font-kwajong ${isMobile ? 'text-xs' : 'text-lg'}`}>
                  The IGLA system operates through invisible integration, utilizing encrypted
                  communication protocols that ensure seamless functionality while providing
                  military-grade security that integrates flawlessly with your vehicle's original
                  electronics.
                </p>

                <p className={`font-kwajong ${isMobile ? 'text-xs' : 'text-lg'}`}>
                  In an era where professional theft rings employ increasingly sophisticated tools,
                  the IGLA Anti-Theft System provides the advanced protection your investment
                  deserves. F.A.S. Motorsports stands as the exclusive certified installer in
                  Southwest Florida, delivering unparalleled expertise.
                </p>

                <div
                  className={`font-borg text-accent tracking-widest ${isMobile ? 'text-xs pt-2' : 'text-sm pt-4'}`}
                >
                  — INSTALLED BY CERTIFIED PROFESSIONALS ONLY —
                </div>
              </motion.div>
            </div>

            <motion.div
              className={`${isMobile ? 'space-y-3' : 'space-y-6'}`}
              initial={{ opacity: 0, x: 30 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 2.8, duration: 0.8 }}
            >
              <h4
                className={`font-medium text-slate-200 tracking-wide font-ethno ${isMobile ? 'text-sm' : 'text-xl'}`}
              >
                PROTECTION MATRIX
              </h4>
              <div className={`${isMobile ? 'space-y-2' : 'space-y-4'}`}>
                {securityFeatures.map((feature, index) => (
                  <motion.div
                    key={index}
                    className={`flex items-center group ${isMobile ? 'space-x-2' : 'space-x-4'}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ delay: 3 + index * 0.1, duration: 0.5 }}
                  >
                    <div
                      className={`bg-slate-500 rounded-full group-hover:bg-white transition-colors duration-300 ${isMobile ? 'w-1.5 h-1.5' : 'w-2 h-2'}`}
                    ></div>
                    <span
                      className={`text-slate-400 font-light group-hover:text-slate-300 transition-colors duration-300 font-kwajong ${isMobile ? 'text-xs' : ''}`}
                    >
                      {feature}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Premium Call to Action */}
        <motion.div
          className={`text-center ${isMobile ? 'space-y-6' : 'space-y-12'}`}
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 3.5, duration: 1 }}
        >
          <div className={`${isMobile ? 'space-y-3' : 'space-y-6'}`}>
            <h3
              className={`font-light text-white leading-tight font-captain ${isMobile ? 'text-lg' : 'text-3xl lg:text-5xl'}`}
            >
              SCHEDULE YOUR <span className="font-bold chrome-text font-cyber">INSTALLATION</span>
            </h3>
            <p
              className={`text-slate-400 mx-auto font-light leading-relaxed font-kwajong ${isMobile ? 'text-xs max-w-full' : 'text-xl max-w-4xl'}`}
            >
              Our certified technicians will conduct a comprehensive assessment of your vehicle to
              determine the optimal IGLA configuration — executed with precision and without
              disrupting factory systems.
            </p>
            <p
              className={`text-slate-500 mx-auto font-light font-kwajong ${isMobile ? 'text-xs max-w-full' : 'text-base max-w-3xl'}`}
            >
              Installation specifications vary by vehicle make, model, and IGLA system version. We
              maintain complete transparency in our pricing structure and provide detailed
              consultations.
            </p>
            <div
              className={`font-borg text-accent tracking-widest ${isMobile ? 'text-xs' : 'text-sm'}`}
            >
              — PROTECT YOUR INVESTMENT WITH MILITARY-GRADE SECURITY —
            </div>
          </div>

          <div
            className={`flex justify-center items-center ${isMobile ? 'flex-col gap-3' : 'flex-col sm:flex-row gap-6'}`}
          >
            <motion.div whileTap={{ scale: 0.98 }}>
              <Button
                size={isMobile ? 'default' : 'lg'}
                className={`relative inline-flex group bg- text-black hover:bg-slate-100 font-medium shadow-2xl hover:shadow-white/20 transition-all duration-500 rounded-xl metallic-btn font-ethno ${isMobile ? 'px-6 py-3 text-sm' : 'px-12 py-4 text-lg'}`}
                href="/schedule"
                text="SCHEDULE CONSULTATION"
                onClick={() => {
                  /* handle schedule consultation click */
                }}
              >
                <Calendar
                  className={`relative inline-flex mr-2 ${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`}
                />
                SCHEDULE CONSULTATION
                <motion.div
                  className="ml-2"
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                ></motion.div>
              </Button>
            </motion.div>

            <motion.div whileTap={{ scale: 0.98 }}>
              <Button
                size={isMobile ? 'default' : 'lg'}
                variant="outline"
                className={`border-2 border-slate-600/50 text-slate-300 hover:bg-black/50 hover:text-white hover:border-slate-500/70 font-medium backdrop-blur-sm rounded-xl transition-all duration-500 industrial-glow font-ethno ${isMobile ? 'px-6 py-3 text-sm' : 'px-12 py-4 text-lg'}`}
                href="/contact"
              >
                REQUEST QUOTE
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default IGLASecurity;
