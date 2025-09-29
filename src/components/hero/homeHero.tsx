'use client';

import SocialMedia from '@/components/divider/socialMedia';
import BrandDivider from '../divider/brandDivider';

export default function HomeHero() {
  return (
    <section
      id="homeHero"
      className="relative flex items-center justify-center py-[-10px] pt-10 mb-[-8px]"
    >
      {/* Overlay to darken the video for better text visibility */}
      <div className="z-0 absolute inset-0 pointer-events-none" />
      <div className="relative mb-[-10px]">
        {/* Video Background */}
        <video
          aria-hidden="true"
          src="https://framerusercontent.com/assets/1g8IkhtJmlWcC4zEYWKUmeGWzI.mp4"
          loop
          preload="auto"
          muted
          playsInline
          autoPlay
          style={{
            cursor: 'auto',
            width: '100%',
            height: '100%',
            borderRadius: '0px',
            display: 'block',
            objectFit: 'cover',
            backgroundColor: 'rgba(204, 8, 8, 0)',
            objectPosition: '50% 50%',
            zIndex: 0,
            filter: 'brightness(0.6) contrast(1.2) saturate(1.2) grayscale(100%)',
            opacity: 1
          }}
        />
        <div className="absolute inset-0 flex flex-col items-center text-center justify-center pointer-events-none">
          {/* Content */}
          <BrandDivider className="justify-center" />
          <div className="max-w-3xl px-6 text-center flex flex-col items-center"></div>

          <p className="text-2xl text-gradient text-primary platinum mt-10 font-borg text-glow pb-2 sm:text-3xl">
            Power Up Your Ride
          </p>
          <h2 className="text-4xl font-bold font-ethno italic sm:text-6xl">
            Unleash <span className="text-gray-400">Performance</span>
          </h2>
          <p className="mt-2 text-base font-medium font-ethno italic text-white/70 sm:text-xl/8">
            Premium performance upgrades tailored to your build.
          </p>
          <SocialMedia className="relative pointer-events-auto mt-4 py-4 pb-10 mb-7" />
        </div>
      </div>
    </section>
  );
}
