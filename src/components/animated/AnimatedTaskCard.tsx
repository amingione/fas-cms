'use client';

import AnimatedInViewSection from '../animation/AnimatedInViewSection';
import TaskCard from '../carousels/TaskCard';

const AnimatedTaskCard = () => (
  <AnimatedInViewSection delay={0.2} direction="up">
    <TaskCard />
  </AnimatedInViewSection>
);

export default AnimatedTaskCard;
