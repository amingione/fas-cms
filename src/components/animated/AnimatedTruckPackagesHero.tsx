'use client';

import AnimatedInViewSection from '../animation/AnimatedInViewSection';
import { TruckPackagesHero } from '../TruckPackagesHero';

const AnimatedTruckPackagesHero = () => (
  <AnimatedInViewSection delay={0.1} direction="up">
    <TruckPackagesHero />
  </AnimatedInViewSection>
);

export default AnimatedTruckPackagesHero;
