import { useEffect, useState } from 'react';

export default function HPGauge({ horsepower }) {
  const [angle, setAngle] = useState(0);

  useEffect(() => {
    // 600–1500hp → angle 0° to 180°
    const mapped = ((horsepower - 600) / 900) * 180;
    setAngle(mapped);
  }, [horsepower]);

  return (
    <div className="relative w-48 h-24">
      <svg viewBox="0 0 200 100" className="w-full h-full">
        <path d="M10 100 A90 90 0 0 1 190 100" fill="none" stroke="#444" strokeWidth="8" />
        <line
          x1="100"
          y1="100"
          x2={100 + 80 * Math.cos(Math.PI * (angle - 90) / 180)}
          y2={100 + 80 * Math.sin(Math.PI * (angle - 90) / 180)}
          stroke="#00ffff"
          strokeWidth="4"
        />
        <circle cx="100" cy="100" r="5" fill="#00ffff" />
      </svg>
      <p className="absolute left-1/2 bottom-0 transform -translate-x-1/2 text-white text-xs mt-2">
        {horsepower} whp
      </p>
    </div>
  );
}