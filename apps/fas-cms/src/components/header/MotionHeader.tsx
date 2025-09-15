import React from 'react';
import { motion } from 'framer-motion';

type MotionHeaderProps = {
  className?: string;
  children: React.ReactNode;
};

export default function MotionHeader({ className = '', children }: MotionHeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.header>
  );
}

