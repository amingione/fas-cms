import { motion } from 'framer-motion';
import Spline from '@splinetool/react-spline';
import Button from './button.jsx';

export default function SplinePortingShowcase() {
  return (
    <motion.section
      className="flex flex-col md:flex-row items-center justify-center py-20 bg-dark text-white"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      viewport={{ once: true }}
    >
      <motion.div
        className="w-full md:w-1/2 flex justify-center"
        initial={{ x: -100, opacity: 0 }}
        whileInView={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 50, delay: 0.1 }}
        viewport={{ once: true }}
      >
        <div className="w-full max-w-md transition-transform duration-300 hover:scale-105 hover:shadow-2xl">
          <Spline
            scene="https://prod.spline.design/1DFW64Md3pCgCPVv/scene.splinecode"
            style={{ width: '100%', height: '400px' }}
          />
        </div>
      </motion.div>

      <motion.div
        className="w-full md:w-1/2 px-8 mt-8 md:mt-0 text-center md:text-left"
        initial={{ x: 100, opacity: 0 }}
        whileInView={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 50, delay: 0.3 }}
        viewport={{ once: true }}
      >
        <h2 className="text-4xl font-bold mb-4 font-ethno">Ready to Unlock Power?</h2>
        <p className="text-white/70 mb-6 font-cyber">
          Explore our porting packages designed to dominate the track — built for performance,
          perfected for the street.
        </p>
        <Button href="/porting" text="Build Your Ported Package" />
      </motion.div>
    </motion.section>
  );
}
