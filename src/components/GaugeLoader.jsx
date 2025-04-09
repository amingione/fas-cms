import { useEffect, useState } from 'react';

export default function GaugeLoader() {
  const [angle, setAngle] = useState(0);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setAngle(prev => {
        let next = prev + 5 * direction;
        if (next >= 180 || next <= 0) {
          setDirection(d => -d);
        }
        return Math.max(0, Math.min(180, next));
      });
    }, 16); // ~60fps
    return () => clearInterval(interval);
  }, [direction]);

  const needleX = 100 + 80 * Math.cos(Math.PI * (angle - 90) / 180);
  const needleY = 100 + 80 * Math.sin(Math.PI * (angle - 90) / 180);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black z-50">
      <svg viewBox="0 0 200 200" className="w-48 h-48">
        <circle cx="100" cy="100" r="90" stroke="#333" strokeWidth="15" fill="none" />
        <line x1="100" y1="100" x2={needleX} y2={needleY} stroke="#FF0000" strokeWidth="4" />
        <circle cx="100" cy="100" r="6" fill="#FF0000" />
      </svg>
    </div>
  );
}
