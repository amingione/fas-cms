'use client';

import AnimatedInViewSection from '../animation/AnimatedInViewSection';
import HomeHero from '../hero/homeHero';

const AnimatedHomeHero = () => (
  <AnimatedInViewSection delay={0.1} direction="up" offset={60}>
    <HomeHero />
  </AnimatedInViewSection>
);

export default AnimatedHomeHero;
