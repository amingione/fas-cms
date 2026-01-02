import { motion } from 'framer-motion';

type Props = {
  images: string[];
  imageWidth?: number;
  imageHeight?: number;
  rotateSpeed?: number; // seconds
  pauseOnHover?: boolean;
  translateZ?: number;
  borderRadius?: number;
  showBackface?: boolean;
};

export default function ThreeDGallery({
  images,
  imageWidth = 200,
  imageHeight = 170,
  rotateSpeed = 80,
  pauseOnHover = true,
  translateZ = 360,
  borderRadius = 5,
  showBackface = true
}: Props) {
  const totalItems = Math.max(images.length, 6);
  const spreadAngle = 360 / totalItems;
  const carouselHeight = Math.max(imageHeight * 3, 420);

  const filledImages = [
    ...images,
    ...Array.from(
      { length: totalItems - images.length },
      (_, i) => `https://picsum.photos/200/120?random=${i}`
    )
  ];

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        perspective: '1000px',
        height: carouselHeight
      }}
    >
      <motion.div
        className={`absolute top-1/2 left-1/2`}
        style={{
          transformStyle: 'preserve-3d',
          transformOrigin: 'center center'
        }}
        animate={{ rotateY: [0, 360] }}
        transition={{
          repeat: Infinity,
          ease: 'linear',
          duration: rotateSpeed
        }}
        whileHover={pauseOnHover ? { animationPlayState: 'paused' as any } : {}}
      >
        {filledImages.map((src, index) => {
          const angle = index * spreadAngle;
          const transform = `
            translate(-50%, -50%)
            rotateY(${angle}deg)
            translateZ(${translateZ}px)
          `;

          return (
            <figure
              key={index}
              className="absolute top-1/2 left-1/2"
              style={{
                width: imageWidth,
                height: imageHeight,
                transform,
                borderRadius,
                backfaceVisibility: showBackface ? 'visible' : 'hidden'
              }}
            >
              <img
                src={src}
                alt={`carousel-${index}`}
                className="w-full h-full object-cover cursor-pointer transition-transform duration-500 hover:scale-110"
                style={{
                  borderRadius,
                  backfaceVisibility: showBackface ? 'visible' : 'hidden'
                }}
              />
            </figure>
          );
        })}
      </motion.div>
    </div>
  );
}
