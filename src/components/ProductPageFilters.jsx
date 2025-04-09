import { useState, useEffect } from 'react';

const vehicleModels = ['Charger', 'Challenger', 'TRX', 'Trackhawk', 'Durango', 'Mustang', 'Raptor', 'F150', 'F250', 'F350', 'F450'];
const tuneOptions = ['Required', 'Not Required'];

export default function ProductPageFilters({ onFilterChange }) {
  const [vehicle, setVehicle] = useState(null);
  const [tune, setTune] = useState(null);
  const [horsepower, setHorsepower] = useState(600);

  useEffect(() => {
    onFilterChange?.({ vehicle, tune, horsepower });
  }, [vehicle, tune, horsepower]);

  return (
    <div className="w-full bg-white/5 border border-white/10 rounded-lg p-6 backdrop-blur-md space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Vehicle Model</h3>
        <div className="flex flex-wrap gap-2">
          {vehicleModels.map(model => (
            <button
              key={model}
              type="button"
              onClick={() => setVehicle(model)}
              className={`px-4 py-2 text-sm rounded transition ${
                vehicle === model ? 'bg-primary text-black' : 'bg-white/10 hover:bg-primary hover:text-black'
              }`}
            >
              {model}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Tune Required</h3>
        <div className="flex gap-4">
          {tuneOptions.map(option => (
            <button
              key={option}
              type="button"
              onClick={() => setTune(option)}
              className={`px-4 py-2 text-sm rounded transition ${
                tune === option ? 'bg-primary text-black' : 'bg-white/10 hover:bg-primary hover:text-black'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Horsepower Range</h3>
        <input
          type="range"
          min="600"
          max="1500"
          step="50"
          value={horsepower}
          onChange={(e) => setHorsepower(Number(e.target.value))}
          className="w-full accent-primary"
        />
        <div className="text-sm text-gray-400 mt-1">Selected WHP: {horsepower}</div>
      </div>
    </div>
  );
}
