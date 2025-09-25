'use client';

import AnimatedInViewSection from '../animation/AnimatedInViewSection';
import ThreeDGallery from '../carousels/ThreeDGallery';
import type { ComponentProps } from 'react';

type ThreeDGalleryProps = ComponentProps<typeof ThreeDGallery>;

type AnimatedThreeDGalleryProps = ThreeDGalleryProps & {
  delay?: number;
};

const AnimatedThreeDGallery = ({ delay = 0.2, ...props }: AnimatedThreeDGalleryProps) => (
  <AnimatedInViewSection delay={delay} direction="up">
    <ThreeDGallery {...props} />
  </AnimatedInViewSection>
);

export default AnimatedThreeDGallery;
