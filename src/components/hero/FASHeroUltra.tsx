import { motion } from 'framer-motion';
import './FASHeroUltra.css';

type GalleryCard = {
  label: string;
  href: string;
  icon?: string;
};

type Props = {
  bgUrl?: string;
  titleTop?: string;
  titleEmphasis?: string;
  subtitle?: string;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  galleries?: GalleryCard[];
};

const defaultGalleries: GalleryCard[] = [
  { label: 'Customer Builds', href: '/builds' },
  { label: 'Belak Wheels', href: '/belak/wheels' },
  { label: 'JTX Wheels', href: '/jtx/wheels' },
  { label: 'Custom Fabrication', href: '/services/customFab' }
];

export default function FASHeroUltra({
  bgUrl = '/images/backgrounds/hero/breaks-and-misc-car-parts.webp',
  titleTop = "SEE WHAT'S POSSIBLE",
  subtitle = 'Browse our builds, galleries, and custom work. Real cars. Real transformations.',
  primaryCta = { label: 'Shop Performance', href: '/shop' },
  secondaryCta = { label: 'View Packages', href: '/packages' },
  galleries = defaultGalleries
}: Props) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <section className="fas-hero-ultra-v2" aria-label="FAS Hero Gallery">
      <div className="fas-hero-bg-v2" style={{ backgroundImage: `url(${bgUrl})` }} />
      <div className="fas-hero-vignette-v2" />
      <div className="fas-hero-accent-v2" />

      <div className="fas-hero-container-v2">
        {/* Header Section */}
        <motion.div
          className="fas-hero-header-v2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="fas-hero-h1-v2">
            <span className="top-v2">{titleTop}</span>
          </h1>

          <p className="fas-hero-p-v2">{subtitle}</p>

          <div className="fas-hero-cta-v2">
            <a className="btn-glass btn-primary btn-md font-ethno" href={primaryCta.href}>
              {primaryCta.label}
            </a>
            <a className="btn-glass btn-outline btn-md font-ethno" href={secondaryCta.href}>
              {secondaryCta.label}
            </a>
          </div>
        </motion.div>

        {/* Gallery Grid Section */}
        <motion.div
          className="fas-gallery-grid-v2"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {galleries.map((gallery, index) => (
            <motion.a
              key={index}
              href={gallery.href}
              className="gallery-card-v2"
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="gallery-card-inner-v2">
                <span className="gallery-icon-v2">{gallery.icon || '→'}</span>
                <span className="gallery-label-v2">{gallery.label}</span>
              </div>
              <div className="gallery-overlay-v2" />
            </motion.a>
          ))}
        </motion.div>

        {/* Stats Section */}
        <motion.div
          className="fas-hero-stats-v2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <div className="stat-item-v2">
            <div className="stat-number-v2">800–1500+</div>
            <div className="stat-label-v2">WHP Builds</div>
          </div>
          <div className="divider-v2" />
          <div className="stat-item-v2">
            <div className="stat-number-v2">Billet</div>
            <div className="stat-label-v2">Precision</div>
          </div>
          <div className="divider-v2" />
          <div className="stat-item-v2">
            <div className="stat-number-v2">Fast</div>
            <div className="stat-label-v2">Ship + Support</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
