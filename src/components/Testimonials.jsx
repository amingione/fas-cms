import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/autoplay';
import 'swiper/css/effect-fade';
import 'swiper/css/pagination';

const testimonials = [
  {
    name: 'Jake H.',
    vehicle: 'Dodge Charger Hellcat',
    message:
      'F.A.S. turned my stock Hellcat into a beast. Over 900hp and still daily drivable. Real pros.'
  },
  {
    name: 'Lindsey M.',
    vehicle: 'Jeep Trackhawk',
    message: 'Super happy with the IGLA install and tuning work. Trackhawk feels sharper than ever.'
  },
  {
    name: 'Devin S.',
    vehicle: 'Ram TRX',
    message: 'The custom package they built for my TRX is unreal. It sounds angry and pulls hard.'
  }
];

export default function Testimonials() {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      <Swiper
        className="h-[300px] custom-swiper-pagination"
        modules={[Autoplay, EffectFade, Pagination]}
        slidesPerView={1}
        loop={true}
        autoplay={{
          delay: 3000,
          disableOnInteraction: false,
          pauseOnMouseEnter: true
        }}
        speed={1000}
        spaceBetween={0}
        centeredSlides={true}
        effect="fade"
        pagination={{ clickable: true }}
        onSwiper={(swiper) => {
          swiper?.autoplay?.start();
        }}
      >
        {testimonials.map((t, index) => (
          <SwiperSlide key={index}>
            <div className="bg-[#1a1a1a] text-white p-6 rounded-lg border border-gray-700 flex flex-col justify-center items-center min-h-[250px] max-w-2xl mx-auto shadow-lg">
              <p className="text-accent text-center text-lg md:text-xl leading-snug mb-4">
                &quot;{t.message}&quot;
              </p>
              <p className="text-xs md:text-sm text-white/70 text-center">
                – {t.name}, <span className="text-primary">{t.vehicle}</span>
              </p>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
