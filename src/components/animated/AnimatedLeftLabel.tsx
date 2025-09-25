'use client';

import AnimatedInViewSection from '../animation/AnimatedInViewSection';
import LeftLabel from '../divider/leftLabel';

const AnimatedLeftLabel = () => (
  <AnimatedInViewSection delay={0.1} duration={0.6} offset={20} direction="up">
    <LeftLabel />
  </AnimatedInViewSection>
);

export default AnimatedLeftLabel;
