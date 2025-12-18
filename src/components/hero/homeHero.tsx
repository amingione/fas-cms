'use client';

import { useEffect, useRef } from 'react';
import SocialMedia from '@/components/divider/socialMedia';
import BrandDivider from '../divider/brandDivider';

export default function HomeHero() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const enableAutoplay = () => {
      video.muted = true;
      video.playsInline = true;
      video.setAttribute('muted', '');
      video.setAttribute('playsinline', '');

      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          // If autoplay is blocked, retry after a user interaction.
        });
      }
    };

    const handleUserInteraction = () => {
      enableAutoplay();
      window.removeEventListener('touchstart', handleUserInteraction);
      window.removeEventListener('click', handleUserInteraction);
    };

    enableAutoplay();
    window.addEventListener('touchstart', handleUserInteraction, { once: true });
    window.addEventListener('click', handleUserInteraction, { once: true });

    return () => {
      window.removeEventListener('touchstart', handleUserInteraction);
      window.removeEventListener('click', handleUserInteraction);
    };
  }, []);

  return (
    <section
      id="homeHero"
      className="relative flex items-center justify-center pb-5 sm:pb-6 mb-12 sm:mb-16 lg:mb-[-8px] bg-dark"
    >
      <div className="relative w-full overflow-hidden rounded-none min-h-[420px] sm:min-h-[520px] lg:min-h-[620px]">
        {/* Video Background */}
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          aria-hidden="true"
          src="https://framerusercontent.com/assets/1g8IkhtJmlWcC4zEYWKUmeGWzI.mp4"
          loop
          preload="auto"
          muted
          playsInline
          autoPlay
          style={{
            cursor: 'auto',
            backgroundColor: 'rgba(204, 8, 8, 0)',
            objectPosition: '50% 50%',
            filter: 'brightness(0.6) contrast(1.2) saturate(1.2) grayscale(100%)',
            opacity: 1
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-dark backdrop-blur-[1px] pointer-events-none"
        />
        <div className="luxury-particles relative z-10 flex h-full flex-col items-center justify-center text-center px-4 py-16 sm:px-6 sm:py-20 pointer-events-none">
          {/* Content */}
          <BrandDivider className="justify-center" />
          <div className="max-w-3xl px-6 text-center flex flex-col items-center"></div>

          <p className="text-2xl text-white/50 platinum mt-10 font-borg pb-2 sm:text-3xl">
            Power Up Your Ride
          </p>
          <h2 className="text-4xl font-bold font-ethno italic sm:text-6xl">
            Unleash <span className="text-gray-400">Performance</span>
          </h2>
          <p className="mt-2 text-base font-medium font-ethno italic text-white/70 sm:text-xl/8">
            Premium performance upgrades tailored to your build.
          </p>
          <SocialMedia className="relative pointer-events-auto mt-6 sm:mt-8 py-4 pb-6 sm:pb-10" />
        </div>
      </div>
    </section>
  );
}
