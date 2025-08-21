import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from '@components/ui/button';
import { Badge } from './ui/badge';
import { ArrowRight, Star, Zap, Settings, Wrench } from 'lucide-react';
import { motion, useInView } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';

export function Products() {
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

  const products = [
    {
      id: 1,
      name: 'Billet Supercharger Plate',
      description:
        'Designed for maximum durability and airflow efficiency, eliminates weak points found in factory cast plates, improves reliability under extreme boost.',
      image: '/images/billet bearing plate.png',
      features: ['2+PSI Average Gain', '50-100whp', 'CNC-Machined Billet'],
      price: '$900',
      popular: true,
      icon: Settings
    },
    {
      id: 2,
      name: 'Hellcat Pulley And Hub Kit',
      description:
        'Built for easy swaps and maximum reliability, this kit gives you the flexibility to dial in your setup without compromise.',
      image: '/images/FAS Pulley & Hub Kit.png',
      features: ['Grip-Coated Billet', 'Internal ½” Hex Drive', 'Industry-Leading Hub Design'],
      price: '$220',
      popular: true,
      icon: Zap
    },
    {
      id: 3,
      name: 'Predator Pulley',
      description:
        'FAS “PREDATOR” Slip On Lower Pulley. Patent-pending innovation – precision-engineered for flawless performance.',
      image: '/images/predatoru pulley homepage copy.png',
      features: ['1.5-2psi Gain', 'Slip On Design', 'No Tune Required'],
      price: 'From $899',
      popular: true,
      icon: Wrench
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 50, scale: 0.9 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: 'easeOut'
      }
    }
  };

  const ProductCard = ({ product, index }: { product: any; index: number }) => {
    const Icon = product.icon;
    return (
      <motion.div
        variants={itemVariants}
        whileHover={
          !isMobile
            ? {
                y: -10,
                scale: 1.02,
                boxShadow: '0 20px 40px rgba(234, 29, 38, 0.2)'
              }
            : {}
        }
        transition={{ duration: 0.3 }}
        className={`h-full ${isMobile ? 'mobile-carousel-item' : ''}`}
      >
        <Card
          className={`group relative overflow-hidden bg-transparent border-gray-200/50 hover:border-primary/50 transition-all duration-500 backdrop-blur-sm industrial-card h-full flex flex-col ${isMobile ? 'mobile-compact-card' : ''}`}
        >
          {product.popular && (
            <motion.div
              className={`absolute ${isMobile ? 'top-2 right-2' : 'top-4 right-4'} z-10`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.8 + index * 0.2, duration: 0.4 }}
            >
              <Badge
                className={`bg-gradient-to-r from-primary to-red-600 text-white shadow-lg shadow-primary/25 font-ethno ${isMobile ? 'text-xs px-2 py-1' : ''}`}
              >
                <Star className={`${isMobile ? 'w-2 h-2 mr-1' : 'w-3 h-3 mr-1'}`} />
                POPULAR
              </Badge>
            </motion.div>
          )}

          <div className="relative overflow-hidden">
            <motion.img
              src={product.image}
              alt={product.name}
              className={`w-full object-cover transition-all duration-500 group-hover:scale-110 ${isMobile ? 'h-40' : 'h-64'}`}
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            {/* Floating icon */}
            <motion.div
              className={`absolute ${isMobile ? 'top-2 left-2 w-8 h-8' : 'top-4 left-4 w-12 h-12'} bg-primary/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-primary/30 industrial-card`}
              whileHover={!isMobile ? { scale: 1.1, rotate: 5 } : {}}
              transition={{ duration: 0.3 }}
            >
              <Icon className={`${isMobile ? 'w-4 h-4' : 'w-6 h-6'} text-primary`} />
            </motion.div>
          </div>

          <CardHeader className={`${isMobile ? 'p-3 space-y-2' : 'space-y-3'}`}>
            <CardTitle
              className={`group-hover:text-primary transition-colors duration-300 font-bold font-ethno ${isMobile ? 'text-sm' : 'text-xl'}`}
            >
              {product.name}
            </CardTitle>
            <CardDescription
              className={`text-graylight leading-relaxed font-kwajong ${isMobile ? 'text-xs' : ''}`}
            >
              {product.description}
            </CardDescription>
          </CardHeader>

          <CardContent
            className={`flex-grow flex flex-col ${isMobile ? 'p-3 space-y-3' : 'space-y-6'}`}
          >
            <div className={`flex flex-wrap gap-1 flex-grow ${isMobile ? 'gap-1' : 'gap-2'}`}>
              {product.features.map((feature: string, featureIndex: number) => (
                <Badge
                  key={featureIndex}
                  variant="secondary"
                  className={`bg-transparent text-black border border-gray-600/50 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all duration-300 font-ethno ${isMobile ? 'text-xs px-2 py-1' : 'text-xs'}`}
                >
                  {feature}
                </Badge>
              ))}
            </div>

            <div
              className={`flex items-center justify-between mt-auto ${isMobile ? 'flex-col gap-2' : ''}`}
            >
              <span
                className={`font-bold text-white font-cyber ${isMobile ? 'text-xs' : 'text-xl'}`}
              >
                {product.price}
              </span>
              <Button
                size={isMobile ? 'sm' : 'sm'}
                className={`group/btn bg-gradient-to-r from-primary to-red-600 hover:from-primary/90 hover:to-red-700 shadow-lg shadow-primary/25 font-ethno ${isMobile ? 'text-xs px-3 py-2' : 'text-[11px]'}`}
              >
                VIEW SPECS
                <motion.div
                  className="ml-2"
                  animate={{ x: [0, 3, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <ArrowRight className={`${isMobile ? 'w-3 h-3' : 'w-3 h-3'}`} />
                </motion.div>
              </Button>
            </div>
          </CardContent>

          {/* Hover glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
        </Card>
      </motion.div>
    );
  };

  return (
    <section
      id="products"
      className={`bg-gradient-to-b from-background via-gray-900/50 to-background relative overflow-hidden ${isMobile ? 'py-8' : 'py-24'}`}
    >
      {/* Background effects */}
      <div className="absolute inset-0 asphalt-texture"></div>
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: `url(/images/shop background.png)`,
          backgroundSize: isMobile ? '300px 225px' : '800px 600px',
          backgroundRepeat: 'repeat',
          backgroundPosition: '0 0'
        }}
      ></div>
      <div className="absolute inset-0 bg-black/20"></div>

      <div
        className={`mx-auto relative z-10 ${isMobile ? '' : 'container px-4 lg:px-6'}`}
        ref={ref}
      >
        <motion.div
          className={`text-center space-y-4 ${isMobile ? 'mb-6 px-4' : 'mb-16'}`}
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
              PRECISION PARTS
            </Badge>
          </motion.div>

          <motion.h2
            className={`font-black leading-tight mobile-section-title ${isMobile ? 'text-lg' : 'text-3xl lg:text-6xl'}`}
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            <span className={`block text-white font-captain ${isMobile ? 'text-base' : ''}`}>
              ENGINEERED FOR
            </span>
            <span
              className={`block chrome-text font-borg ${isMobile ? 'text-base' : 'text-4xl lg:text-7xl'}`}
            >
              MAXIMUM
            </span>
            <span className={`block text-primary font-captain ${isMobile ? 'text-base' : ''}`}>
              PERFORMANCE
            </span>
          </motion.h2>

          <motion.p
            className={`text-graylight max-w-3xl mx-auto leading-relaxed font-kwajong ${isMobile ? 'text-xs px-4' : 'text-lg'}`}
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.6, duration: 0.6 }}
          >
            Our precision-engineered supercharger components are designed and manufactured to the
            highest racing standards, delivering unmatched performance and reliability.
          </motion.p>
          <motion.div
            className={`font-borg text-accent tracking-widest ${isMobile ? 'text-xs px-4' : 'text-sm'}`}
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            — BILLET ALUMINUM • PRECISION MACHINED • TRACK TESTED —
          </motion.div>
        </motion.div>

        {/* Mobile Carousel or Desktop Grid */}
        {isMobile ? (
          <motion.div
            className="mobile-carousel"
            variants={containerVariants}
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
          >
            <div className="mobile-carousel-container">
              {products.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch"
            variants={containerVariants}
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
          >
            {products.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </motion.div>
        )}

        <motion.div
          className={`text-center ${isMobile ? 'mt-6 px-4' : 'mt-16'}`}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 1, duration: 0.6 }}
        >
          <Button
            size={isMobile ? 'sm' : 'lg'}
            variant="outline"
            className={`border-2 border-primary/30 text-primary hover:bg-primary hover:text-white font-bold backdrop-blur-sm group industrial-glow font-ethno ${isMobile ? 'px-6 py-3 text-sm' : 'px-8 py-4 text-lg'}`}
          >
            VIEW ALL PRODUCTS
            <motion.div
              className="ml-2"
              animate={{ x: [0, 5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <ArrowRight className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
            </motion.div>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
