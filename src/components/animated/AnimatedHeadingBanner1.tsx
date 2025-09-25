'use client';

import AnimatedInViewSection from '../animation/AnimatedInViewSection';
import HeadingBanner1 from '../banner/HeadingBanner1';

const AnimatedHeadingBanner1 = () => (
  <AnimatedInViewSection delay={0.15} direction="up">
    <HeadingBanner1 />
  </AnimatedInViewSection>
);

export default AnimatedHeadingBanner1;
