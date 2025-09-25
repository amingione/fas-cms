'use client';

import AnimatedInViewSection from '../animation/AnimatedInViewSection';
import HeadingBanner from '../banner/HeadingBanner';

const AnimatedHeadingBanner = () => (
  <AnimatedInViewSection delay={0.2} direction="up">
    <HeadingBanner />
  </AnimatedInViewSection>
);

export default AnimatedHeadingBanner;
