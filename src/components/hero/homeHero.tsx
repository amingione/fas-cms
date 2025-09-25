'use client';

export default function HomeHero() {
  return (
    <section
      id="homeHero"
      className="relative flex items-center justify-center py-[-10px] pt-[-10px] pb-[-12px] mb-[-12px]"
    >
      {/* Overlay to darken the video for better text visibility */}
      <div className="z-0 absolute inset-0" />
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
        <div className="absolute inset-0 flex flex-col items-center text-center justify-center">
          {/* Content */}
          <section className="border border-rounded rounded-full border-shadow-lg border-black/30 shadow-inner drop-shadow-sm shadow-gray-600 bg-gradient-to-r from-white/5 via-white/1 to-transparent mx-auto w-fit px-2 py-2 mb-4">
            <span className="text-center text-primaryB font-borg sm:text-2xl text-base">
              F.a.S.
            </span>
            <span className="font-ethno text-center text-white text-base sm:text-2xl mb-10">
              {' '}
              Motorsports
            </span>
          </section>

          <p className="text-2xl text-gradient text-primary platinum mt-10 font-borg text-glow pb-2 sm:text-3xl">
            Power Up Your Ride
          </p>
          <h2 className="text-4xl font-bold font-ethno text-outline sm:text-6xl">
            Unleash Performance
          </h2>
          <p className="mt-2 text-base font-medium font-ethno text-outline text-gray-400 sm:text-xl/8">
            Premium performance upgrades tailored to your build.
          </p>
        </div>
      </div>
    </section>
  );
}
