import React, { useState, useEffect } from 'react';

import { Card } from '../ui/card';
import { Button } from '../ui/button';

type HeroCardProps = {
  title?: string;
  description?: string;
  ctaText?: string;
  ctaHref?: string;
  imageSrc?: string;
  backgroundTextureSrc?: string;
  className?: string;
};

const HeroCard: React.FC<HeroCardProps> = ({
  title = 'Since 2002',
  description = 'We are a full production machine and performance shop that specializes in Hellcats, LS, and LT4 based cars.',
  ctaText = 'Learn more',
  ctaHref = '#',
  imageSrc = '/images/FAS-Testing-Day.png',
  backgroundTextureSrc = '',
  className = ''
}) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <section
      className={`relative w-full max-w-7xl mx-auto ${className}`}
      style={{ perspective: '1200px' }}
    >
      {/* Background texture/image */}
      {backgroundTextureSrc && (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40"
          style={{ backgroundImage: `url(${backgroundTextureSrc})` }}
        />
      )}

      {/* 2-column grid layout with increased separation */}
      <div
        className={`relative grid grid-cols-2 ${isMobile ? 'gap-8 px-4 py-8 min-h-screen items-center' : 'gap-16 px-6 py-12 lg:py-20 min-h-[600px] items-center'}`}
      >
        {/* Image section - tilts inward dramatically (rotateY positive) with higher z-index */}
        <div
          className={`relative col-span-1 ${isMobile ? '-mr-2' : '-mr-4 lg:-mr-6'}`}
          style={{ zIndex: 20 }}
        >
          <div
            className="relative h-full transform transition-all duration-700 hover:scale-105"
            style={{
              transform: isMobile
                ? 'rotateY(25deg) rotateX(8deg) rotateZ(-2deg)'
                : 'rotateY(35deg) rotateX(12deg) rotateZ(-3deg)',
              transformStyle: 'preserve-3d',
              transformOrigin: 'right center'
            }}
          >
            <img
              src={imageSrc}
              alt="FAS Workshop"
              className={`${isMobile ? 'w-full h-44 sm:h-52 object-cover rounded-lg' : 'w-full h-auto max-h-96 lg:max-h-[500px] object-cover rounded-2xl lg:rounded-3xl'} shadow-2xl`}
              style={{
                boxShadow:
                  '0 30px 60px rgba(0,0,0,0.5), 0 20px 40px rgba(234,29,38,0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
              }}
            />
            {/* Enhanced 3D shadow layers for dramatic depth */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-transparent rounded-lg lg:rounded-3xl transform translate-x-3 translate-y-3 -z-10 opacity-70" />
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent to-primary/30 rounded-lg lg:rounded-3xl transform translate-x-6 translate-y-6 -z-20 opacity-50" />
            <div className="absolute inset-0 bg-gradient-to-bl from-neutral-900/20 to-transparent rounded-lg lg:rounded-3xl transform translate-x-9 translate-y-9 -z-30 opacity-30" />
          </div>
        </div>

        {/* CTA Card section - tilts inward dramatically (rotateY negative) with lower z-index */}
        <div
          className={`relative col-span-1 ${isMobile ? '-ml-2' : '-ml-4 lg:-ml-6'}`}
          style={{ zIndex: 10 }}
        >
          <Card
            className="relative overflow-hidden bg-transparent border-none p-0 transition-all duration-700 hover:scale-105"
            style={{
              transform: isMobile
                ? 'rotateY(-25deg) rotateX(8deg) rotateZ(2deg)'
                : 'rotateY(-35deg) rotateX(12deg) rotateZ(3deg)',
              transformStyle: 'preserve-3d',
              transformOrigin: 'left center'
            }}
          >
            {/* Larger gradient background with 50% opacity - extends beyond card */}
            <div
              className={`absolute ${isMobile ? '-inset-4' : '-inset-8 lg:-inset-12'} bg-gradient-to-b from-red-950/50 via-neutral-900/50 to-neutral-950/50 ${isMobile ? 'rounded-xl' : 'rounded-3xl lg:rounded-[2rem]'}`}
              style={{
                boxShadow: '0 25px 50px rgba(0,0,0,0.4), 0 15px 30px rgba(234,29,38,0.2)',
                opacity: 0.5
              }}
            />

            {/* Main card background */}
            <div
              className={`absolute inset-0 bg-gradient-to-b from-red-950/30 via-neutral-900/40 to-neutral-950/50 ${isMobile ? 'rounded-lg' : 'rounded-2xl lg:rounded-3xl'}`}
              style={{
                boxShadow: '0 20px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
              }}
            />

            {/* 3D border glow effect */}
            <div
              className={`absolute inset-0 ${isMobile ? 'rounded-lg' : 'rounded-2xl lg:rounded-3xl'} bg-gradient-to-r from-primary/40 via-transparent to-primary/40 p-[1px]`}
            >
              <div
                className={`w-full h-full bg-transparent ${isMobile ? 'rounded-lg' : 'rounded-2xl lg:rounded-3xl'}`}
              />
            </div>

            {/* Content - right-aligned */}
            <div
              className={`relative z-10 ${isMobile ? 'p-4 space-y-3 text-right' : 'p-8 lg:p-12 space-y-6 lg:space-y-8 text-right'}`}
            >
              {/* Title - right aligned */}
              <h1
                className={`${isMobile ? 'text-xl sm:text-2xl leading-tight font-borg' : 'text-3xl lg:text-4xl xl:text-5xl leading-none font-borg'} font-normal text-white transition-all duration-300`}
                style={{
                  textShadow: '3px 3px 6px rgba(0,0,0,0.8)',
                  transform: 'translateZ(20px)',
                  lineHeight: isMobile ? '1.2' : 'normal'
                }}
              >
                {title}
              </h1>

              {/* Description with rotation effect - right aligned with better visibility */}
              <div
                className="transform rotate-1 transition-transform duration-300 hover:rotate-0"
                style={{ transform: 'translateZ(15px) rotate(1deg)' }}
              >
                <p
                  className={`${isMobile ? 'text-sm leading-relaxed font-mono' : 'text-base lg:text-xl leading-relaxed font-mono'} font-normal text-white ${isMobile ? 'max-w-full' : 'max-w-md ml-auto'}`}
                  style={{
                    textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                    lineHeight: isMobile ? '1.4' : '1.6',
                    wordSpacing: isMobile ? '0.05em' : 'normal'
                  }}
                >
                  {isMobile ? (
                    // Better mobile formatting with more readable line breaks
                    <>
                      We are a full production
                      <br />
                      machine and performance
                      <br />
                      shop that specializes in
                      <br />
                      Hellcats, LS, and LT4
                      <br />
                      based cars.
                    </>
                  ) : (
                    description
                  )}
                </p>
              </div>

              {/* CTA Button (optional) */}
              <div
                className={`${isMobile ? 'pt-2 flex justify-end' : 'pt-4 flex justify-end'}`}
                style={{ transform: 'translateZ(25px)' }}
              >
                {!!ctaText && (
                  <Button
                    asChild
                    variant="secondary"
                    size={isMobile ? 'md' : 'lg'}
                    className={`inline-flex ${isMobile ? 'px-4 py-2 text-sm' : 'px-8 py-4 text-lg'} bg-zinc-600 hover:bg-zinc-500 text-white font-medium rounded-lg transition-all duration-300 hover:shadow-xl hover:scale-105 hover:shadow-primary/30`}
                    style={{
                      boxShadow: '0 8px 16px rgba(0,0,0,0.4), 0 4px 8px rgba(234,29,38,0.2)',
                      transform: 'perspective(1000px)'
                    }}
                  >
                    <a href={ctaHref}>{ctaText}</a>
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* 3D Floating elements that enhance the depth */}
      <div
        className="absolute top-1/4 left-1/4 w-3 h-3 bg-primary/25 rounded-full animate-pulse"
        style={{ transform: 'translateZ(50px)' }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-2 h-2 bg-white/80 rounded-full animate-ping"
        style={{ transform: 'translateZ(30px)' }}
      />
      <div
        className="absolute top-3/4 left-1/3 w-4 h-4 bg-accent/20 rounded-full animate-bounce"
        style={{ transform: 'translateZ(40px)' }}
      />
    </section>
  );
};

export default HeroCard;
