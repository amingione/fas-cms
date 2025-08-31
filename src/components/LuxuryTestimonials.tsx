import { motion, useInView } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { Star, Quote, Award, ShieldCheck } from 'lucide-react';
import { Badge } from './ui/badge';

export function LuxuryTestimonials() {
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

  const testimonials = [
    {
      name: 'Marcus Rodriguez',
      title: 'Professional Racing Driver',
      content:
        'F.A.S. Motorsports transformed my RAM TRX into an absolute beast. The attention to detail and quality of work is unmatched. Every component is engineered to perfection.',
      rating: 5,
      project: 'RAM TRX 850HP Build',
      image: '/api/placeholder/60/60'
    },
    {
      name: 'Sarah Chen',
      title: 'Automotive Enthusiast',
      content:
        'The custom supercharger setup they built for my Hellcat is incredible. The power delivery is smooth, reliable, and the craftsmanship is simply stunning.',
      rating: 5,
      project: 'Hellcat Supercharger Kit',
      image: '/api/placeholder/60/60'
    },
    {
      name: 'David Thompson',
      title: 'Track Day Veteran',
      content:
        "I've worked with many shops, but F.A.S. Motorsports stands in a league of their own. Their billet aluminum work is art meets engineering.",
      rating: 5,
      project: 'Custom Billet Components',
      image: '/api/placeholder/60/60'
    }
  ];

  const certifications = [
    {
      icon: Award,
      title: 'ASE Certified',
      description: 'Master Technicians'
    },
    {
      icon: ShieldCheck,
      title: 'ISO 9001',
      description: 'Quality Management'
    },
    {
      icon: Star,
      title: '5-Star Rating',
      description: 'Customer Excellence'
    }
  ];

  const TestimonialCard = ({ testimonial, index }: { testimonial: any; index: number }) => (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: 0.2 + index * 0.1, duration: 0.6 }}
      className={`relative luxury-glass luxury-hover-scale ${isMobile ? 'p-4' : 'p-6'} rounded-2xl border border-gray-700/50`}
    >
      <div className="luxury-particles absolute inset-0 rounded-2xl overflow-hidden"></div>

      {/* Quote Icon */}
      <div className="relative z-10">
        <Quote className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} text-luxury-gold mb-4 opacity-60`} />

        {/* Rating Stars */}
        <div className="flex space-x-1 mb-3">
          {[...Array(testimonial.rating)].map((_, i) => (
            <Star
              key={i}
              className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} text-luxury-gold fill-current`}
            />
          ))}
        </div>

        {/* Content */}
        <p
          className={`text-graylight leading-relaxed font-kwajong ${isMobile ? 'text-xs mb-4' : 'text-sm mb-6'}`}
        >
          "{testimonial.content}"
        </p>

        {/* Author Info */}
        <div className="flex items-center space-x-3">
          <div
            className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} rounded-full bg-gradient-to-br from-primary/20 to-luxury-gold/20 flex items-center justify-center luxury-gold-glow`}
          >
            <span className={`text-white font-bold font-ethno ${isMobile ? 'text-xs' : 'text-sm'}`}>
              {testimonial.name
                .split(' ')
                .map((n: string) => n[0])
                .join('')}
            </span>
          </div>
          <div>
            <div className={`text-white font-bold font-ethno ${isMobile ? 'text-xs' : 'text-sm'}`}>
              {testimonial.name}
            </div>
            <div className={`text-graylight font-kwajong ${isMobile ? 'text-xs' : 'text-xs'}`}>
              {testimonial.title}
            </div>
            <Badge
              variant="outline"
              className={`mt-1 bg-primary/10 border-primary/30 text-primary font-ethno ${isMobile ? 'text-xs px-2 py-0.5' : 'text-xs'}`}
            >
              {testimonial.project}
            </Badge>
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <section className={`relative ${isMobile ? 'py-8' : 'py-16'} asphalt-texture overflow-hidden`}>
      {/* Background Effects */}
      <div className="absolute inset-0 grunge-overlay"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black/80"></div>

      {/* Floating Particles */}
      {!isMobile && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute"
              style={{
                left: `${20 + i * 15}%`,
                top: `${10 + (i % 3) * 30}%`,
                width: '2px',
                height: '2px'
              }}
              animate={{
                opacity: [0.3, 0.8, 0.3],
                scale: [1, 1.5, 1],
                backgroundColor: ['#d4af37', '#ffffff', '#d4af37']
              }}
              transition={{
                duration: 4,
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
          className={`text-center ${isMobile ? 'mb-6 space-y-3' : 'mb-12 space-y-6'}`}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          <Badge
            variant="outline"
            className={`bg-luxury-gold/10 border-luxury-gold/30 text-luxury-gold font-bold tracking-widest font-ethno luxury-gold-glow ${isMobile ? 'px-4 py-1 text-xs' : 'px-6 py-2 text-sm'}`}
          >
            CLIENT TESTIMONIALS
          </Badge>

          <h2
            className={`font-black leading-tight font-captain ${isMobile ? 'text-lg' : 'text-3xl lg:text-5xl'}`}
          >
            <span className="block text-white">WHAT OUR CLIENTS</span>
            <span className="block luxury-gold-text font-cyber">SAY ABOUT US</span>
          </h2>

          <p
            className={`text-graylight max-w-2xl mx-auto font-kwajong ${isMobile ? 'text-xs leading-relaxed' : 'text-lg'}`}
          >
            Don't just take our word for it. Hear from the drivers who trust F.A.S. Motorsports with
            their most prized builds.
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <div
          className={`grid gap-6 mb-12 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}
        >
          {testimonials.map((testimonial, index) => (
            <TestimonialCard key={index} testimonial={testimonial} index={index} />
          ))}
        </div>

        {/* Certifications */}
        <motion.div
          className={`grid gap-4 ${isMobile ? 'grid-cols-1 max-w-sm mx-auto' : 'grid-cols-3 max-w-4xl mx-auto'}`}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.6, duration: 0.8 }}
        >
          {certifications.map((cert, index) => {
            const Icon = cert.icon;
            return (
              <motion.div
                key={index}
                className="text-center group luxury-hover-scale"
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.8 + index * 0.1, duration: 0.6 }}
              >
                <div
                  className={`bg-gradient-to-br from-luxury-gold/20 to-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:shadow-xl group-hover:shadow-luxury-gold/25 transition-all duration-300 border border-luxury-gold/20 luxury-carbon-effect ${isMobile ? 'w-12 h-12' : 'w-16 h-16'}`}
                >
                  <Icon className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} text-luxury-gold`} />
                </div>
                <div
                  className={`font-bold text-white font-ethno ${isMobile ? 'text-sm' : 'text-lg'}`}
                >
                  {cert.title}
                </div>
                <div className={`text-graylight font-kwajong ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  {cert.description}
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Call to Action */}
        <motion.div
          className={`text-center ${isMobile ? 'mt-8' : 'mt-12'}`}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 1, duration: 0.8 }}
        >
          <p
            className={`text-luxury-gold font-borg mb-4 tracking-widest ${isMobile ? 'text-xs' : 'text-sm'}`}
          >
            — READY TO JOIN OUR FAMILY OF SATISFIED CLIENTS? —
          </p>
          <motion.button
            className={`luxury-btn text-white font-bold transition-all duration-300 rounded-xl font-ethno ${isMobile ? 'px-6 py-3 text-sm' : 'px-8 py-4 text-lg'}`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            START YOUR BUILD
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}

export default LuxuryTestimonials;
