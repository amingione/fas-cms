import React from 'react';
import HeroCard from './HeroCard';

type AboutFASHeroProps = {
  titleTop?: string;
  description?: string;
  ctaText?: string;
  ctaHref?: string;
  imageSrc?: string;
  backgroundTextureSrc?: string;
  className?: string;
};

const AboutFASHero: React.FC<AboutFASHeroProps> = ({
  titleTop = 'Since 2002',
  description = 'We are a full production machine and performance shop that specializes in Hellcats, LS, and LT4 based cars.',
  imageSrc = '/images/FAS-Testing-Day.png',
  backgroundTextureSrc,
  className = ''
}) => {
  return (
    <HeroCard
      title={titleTop}
      description={description}
      imageSrc={imageSrc}
      backgroundTextureSrc={backgroundTextureSrc}
      className={className}
    />
  );
};

export default AboutFASHero;
