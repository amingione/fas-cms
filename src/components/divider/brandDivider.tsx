'use client';

function BrandDivider() {
  return (
    <section id="BrandDivider" className="z-100 lg:pt-10 lg:mt-10 sm:pt-12 sm:mt-12 mb-[-20px]">
      <div className="relative px-2 py-2 items-center object-center inset-0 flex border border-rounded rounded-full border-shadow-sm bg-gradient-to-r from-white/10 via-white/5 to-black mx-auto w-fit backdrop-blur-sm">
        <span className="text-center text-primaryB font-borg sm:text-2xl lg:text-xl">F.a.S.</span>
        <span className="font-ethno text-center text-white sm:text-2xl lg:text-xl">
          Motorsports
        </span>
      </div>
    </section>
  );
}

export default BrandDivider;
