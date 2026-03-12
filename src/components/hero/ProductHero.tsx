import { motion } from 'framer-motion';
import './fas-hero.css';
import img_powerstroke_piping from '@/assets/images/powerstroke-piping.png';

export default function ProductHero() {
  return (
    <section className="fas-hero">
      <div className="hero-bg"></div>

      <div className="hero-overlay"></div>

      <div className="hero-content">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="hero-text"
        >
          <span className="hero-tag">NEW PRODUCT DROP</span>

          <h1>
            2020+ 6.7L Powerstroke <br />
            <span>Piping Kit</span>
          </h1>

          <p>
            Precision TIG welded stainless piping engineered to maximize airflow, boost stability,
            and turbo efficiency.
          </p>

          <div className="hero-buttons">
            <button className="btn-primary">View Product</button>

            <button className="btn-secondary">View Builds</button>
          </div>
        </motion.div>

        <motion.img
          src={img_powerstroke_piping.src}
          alt="Powerstroke piping kit"
          className="hero-product"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
        />
      </div>
    </section>
  );
}
