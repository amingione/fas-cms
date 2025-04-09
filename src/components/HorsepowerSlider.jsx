import { useState } from 'react';
import HPGauge from './HPGauge';

/**
 * @param {{ onHPChange: (hp: number) => void }}
 */
export default function HorsepowerSlider({ onHPChange }) {
  const [hp, setHp] = useState(700);

  const handleChange = (e) => {
    const value = parseInt(e.target.value, 10);
    setHp(value);
    onHPChange(value);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <HPGauge horsepower={hp} />
      <input
        type="range"
        min="600"
        max="1500"
        value={hp}
        onChange={handleChange}
        className="w-full accent-blue-500"
      />
      <p className="text-white text-sm">Selected Horsepower: {hp} whp</p>
    </div>
  );
}