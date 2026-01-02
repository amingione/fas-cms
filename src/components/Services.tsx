import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Cog, Wrench, Zap, Target, Clock, Award, Gauge, Settings } from 'lucide-react';
import { motion, useInView } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';

export function Services() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });
  const [isMobile, setIsMobile] = useState(false);
  const servicesTrackRef = useRef<HTMLDivElement | null>(null);
  const servicesInnerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-scroll the mobile services carousel in an infinite loop
  useEffect(() => {
    if (!isMobile) return;
    const track = servicesTrackRef.current;
    const inner = servicesInnerRef.current;
    if (!track || !inner) return;
    let raf = 0;
    const speed = 0.7; // px per frame
    const tick = () => {
      try {
        track.scrollLeft += speed;
        // Since items are duplicated in a single row, loop at half width
        const w = inner.scrollWidth / 2;
        if (w > 0 && track.scrollLeft >= w) {
          track.scrollLeft -= w;
        }
      } finally {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isMobile]);

  type Service = {
    icon: React.ElementType;
    title: string;
    description: string;
    features: string[];
    color: string;
  };

  const services: Service[] = [
    {
      icon: Cog,
      title: 'Custom Engineering',
      description:
        'Bespoke supercharger modifications tailored to your specific performance requirements.',
      features: ['CAD Design', 'Prototyping', 'Testing & Validation'],
      color: 'from-primary to-red-600'
    },
    {
      icon: Wrench,
      title: 'CNC Machining',
      description: 'State-of-the-art 5-axis CNC machining services for precision manufacturing.',
      features: ['5-Axis Machining', 'Tight Tolerances', 'Quality Control'],
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: Gauge,
      title: 'Performance Tuning',
      description: 'Expert dyno tuning services to optimize your supercharged setup.',
      features: ['Dyno Testing', 'ECU Calibration', 'Performance Analysis'],
      color: 'from-green-500 to-green-600'
    },
    {
      icon: Target,
      title: 'Technical Consulting',
      description: 'Professional consulting services for complex supercharger applications.',
      features: ['Technical Analysis', 'Design Review', 'Implementation Planning'],
      color: 'from-purple-500 to-purple-600'
    },
    {
      icon: Clock,
      title: 'Rapid Prototyping',
      description: 'Fast turnaround prototyping services to quickly validate designs.',
      features: ['3D Printing', 'Quick Iterations', 'Design Validation'],
      color: 'from-orange-500 to-orange-600'
    },
    {
      icon: Award,
      title: 'Quality Assurance',
      description: 'Comprehensive quality control processes ensuring racing standards.',
      features: ['Material Testing', 'Dimensional Inspection', 'Performance Verification'],
      color: 'from-accent to-yellow-600'
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2
      }
    }
  };

  const easeOut = [0.16, 1, 0.3, 1] as const;

  const itemVariants = {
    hidden: { opacity: 0, y: 60, rotateX: -15 },
    visible: {
      opacity: 1,
      y: 0,
      rotateX: 0,
      transition: {
        duration: 0.7,
        ease: easeOut
      }
    }
  };

  const ServiceCard = ({ service, index }: { service: any; index: number }) => {
    const Icon = service.icon;
    return (
      <motion.div
        key={index}
        variants={itemVariants}
        whileHover={
          !isMobile
            ? {
                y: -10,
                scale: 1.05,
                rotateY: 5,
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)'
              }
            : {}
        }
        transition={{ duration: 0.4, ease: easeOut }}
        style={{ perspective: '1000px' }}
        className={`h-full ${isMobile ? 'mobile-carousel-item-small' : ''}`}
      >
        <Card
          className={`group relative border-black-700/50 hover:border-black-500 transition-all duration-500 bg-gradient-to-br from-black-900/90 to-gray-800/90 backdrop-blur-sm overflow-hidden industrial-card h-full flex flex-col ${isMobile ? 'mobile-compact-card' : ''}`}
        >
          <CardHeader className={`relative z-10 ${isMobile ? 'p-3 space-y-2' : 'space-y-4'}`}>
            <motion.div
              className={`bg-gradient-to-br ${service.color} rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-2xl transition-all duration-500 engine-pulse ${isMobile ? 'w-10 h-10' : 'w-16 h-16'}`}
              whileHover={!isMobile ? { scale: 1.1, rotate: 5 } : {}}
              transition={{ duration: 0.3 }}
            >
              <Icon className={`${isMobile ? 'w-5 h-5' : 'w-8 h-8'} text-white`} />
            </motion.div>

            <CardTitle
              className={`group-hover:text-blue-400 transition-colors duration-300 font-bold text-white font-ethno ${isMobile ? 'text-sm' : 'text-xl'}`}
            >
              {service.title}
            </CardTitle>

            <CardDescription>
              <div>
                {service.features.map((feature: string, featureIndex: number) => (
                  <motion.div
                    key={featureIndex}
                    className={`flex items-center group/feature ${isMobile ? 'space-x-2' : 'space-x-3'}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ delay: 0.8 + index * 0.1 + featureIndex * 0.1, duration: 0.4 }}
                  >
                    <div
                      className={`bg-gradient-to-r ${service.color} rounded-full group-hover/feature:scale-125 transition-transform duration-300 ${isMobile ? 'w-1.5 h-1.5' : 'w-2 h-2'}`}
                    ></div>
                    <span
                      className={`text-white/60 group-hover/feature:text-white transition-colors duration-300 font-medium font-ethno ${isMobile ? 'text-xs' : 'text-sm'}`}
                    >
                      {feature}
                    </span>
                  </motion.div>
                ))}
              </div>
            </CardDescription>
          </CardHeader>
          {/* Glow effect on hover */}
          <CardContent>
            <div
              className={`absolute inset-0 bg-gradient-to-br ${service.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none`}
            ></div>

            {/* Racing stripe accent */}
            <div
              className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${service.color} opacity-60`}
            ></div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <section id="services" className={`relative overflow-hidden ${isMobile ? 'py-8' : 'py-24'}`}>
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-b from-black-900 via-background to-black-900"></div>
      <div className="absolute inset-0 asphalt-texture opacity-40"></div>

      {/* Racing lines */}
      <div className="absolute inset-0 road-lines opacity-20"></div>

      <div
        className={`mx-auto relative z-10 ${isMobile ? '' : 'container px-4 lg:px-6'}`}
        ref={ref}
      >
        <motion.div
          className={`text-center space-y-4 ${isMobile ? 'mb-6 px-4' : 'mb-16'}`}
          initial={{ opacity: 0, y: 50 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: easeOut }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <Badge
              variant="outline"
              className={`mb-4 bg-blue-500/10 border-blue-500/30 text-blue-400 font-bold tracking-widest font-ethno ${isMobile ? 'px-3 py-1 text-xs' : 'px-6 py-2 text-sm'}`}
            >
              FULL SERVICE SHOP
            </Badge>
          </motion.div>

          <motion.h2
            className={`font-black leading-tight mobile-section-title ${isMobile ? 'text-lg' : 'text-3xl lg:text-6xl'}`}
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            <span className={`block text-white font-mono ${isMobile ? 'text-sm' : ''}`}>
              COMPLETE
            </span>
            <span
              className={`block chrome-text font-cyber ${isMobile ? 'text-base' : 'text-4xl lg:text-7xl'}`}
            >
              ENGINEERING
            </span>
            <span className={`block text-blue-500 font-mono ${isMobile ? 'text-sm' : ''}`}>
              SOLUTIONS
            </span>
          </motion.h2>

          <motion.p
            className={`text-white/60 max-w-3xl mx-auto leading-relaxed font-kwajong ${isMobile ? 'text-xs px-4' : 'text-lg'}`}
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.6, duration: 0.6 }}
          >
            From concept to completion, we provide comprehensive engineering services to bring your
            high-performance supercharger vision to life with racing precision.
          </motion.p>
          <motion.div
            className={`font-borg text-accent tracking-widest ${isMobile ? 'text-xs px-4' : 'text-sm'}`}
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            — CONCEPT TO COMPLETION • RACING PRECISION • PROVEN RESULTS —
          </motion.div>
        </motion.div>

        {/* Mobile Carousel (auto-scroll) or Desktop Grid */}
        {isMobile ? (
          <motion.div
            className="-mx-4 px-4"
            variants={containerVariants}
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
            transformTemplate={() => 'none'}
            style={{ transform: 'none', WebkitOverflowScrolling: 'touch' as any }}
            role="region"
            aria-label="Services carousel"
          >
            <div
              ref={servicesTrackRef}
              className="overflow-x-auto overflow-y-hidden py-2 scrollbar-thin"
            >
              <div ref={servicesInnerRef} className="flex flex-nowrap gap-4">
                {[...services, ...services].map((service, index) => (
                  <div key={`svc-${index}`} className="flex-none w-[75%] min-w-[260px] max-w-xs">
                    <ServiceCard service={service} index={index % services.length} />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch"
            variants={containerVariants}
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
          >
            {services.map((service, index) => (
              <ServiceCard key={index} service={service} index={index} />
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
}

export default Services;
