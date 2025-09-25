'use client';

import { motion } from 'framer-motion';
import { useRef } from 'react';
import { useInView } from 'framer-motion';
import type { ReactNode } from 'react';

type Direction = 'up' | 'down' | 'left' | 'right' | 'none';

type AnimatedInViewSectionProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  offset?: number;
  direction?: Direction;
  once?: boolean;
};

const directionOffsetMap: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: 40 },
  down: { x: 0, y: -40 },
  left: { x: 40, y: 0 },
  right: { x: -40, y: 0 },
  none: { x: 0, y: 0 }
};

const AnimatedInViewSection = ({
  children,
  className,
  delay = 0,
  duration = 0.8,
  offset = 40,
  direction = 'up',
  once = true
}: AnimatedInViewSectionProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, amount: 0.15 });

  const baseOffset = directionOffsetMap[direction] ?? directionOffsetMap.none;
  const initialX = baseOffset.x === 0 ? 0 : Math.sign(baseOffset.x) * offset;
  const initialY = baseOffset.y === 0 ? 0 : Math.sign(baseOffset.y) * offset;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: initialX, y: initialY, scale: 0.98 }}
      animate={isInView ? { opacity: 1, x: 0, y: 0, scale: 1 } : { opacity: 0, x: initialX, y: initialY, scale: 0.98 }}
      transition={{ delay, duration, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default AnimatedInViewSection;
