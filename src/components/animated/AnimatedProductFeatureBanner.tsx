'use client';

import AnimatedInViewSection from '../animation/AnimatedInViewSection';
import ProductFeatureBanner from '../banner/ProductFeatureBanner';
import type { ComponentProps } from 'react';

type ProductFeatureBannerProps = ComponentProps<typeof ProductFeatureBanner>;

type AnimatedProductFeatureBannerProps = ProductFeatureBannerProps & {
  delay?: number;
};

const AnimatedProductFeatureBanner = ({ delay = 0.2, ...props }: AnimatedProductFeatureBannerProps) => (
  <AnimatedInViewSection delay={delay} direction="up">
    <ProductFeatureBanner {...props} />
  </AnimatedInViewSection>
);

export default AnimatedProductFeatureBanner;
