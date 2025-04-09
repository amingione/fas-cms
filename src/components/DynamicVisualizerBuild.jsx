import React, { useState } from 'react';

const vehicleModels = {
  Charger: 'https://my.spline.design/charger-project-id/embed',
  Mustang: 'https://my.spline.design/mustang-project-id/embed',
  Camaro: 'https://my.spline.design/camaro-project-id/embed',
};

export default function BuildVisualizer() {
  const [selectedVehicle, setSelectedVehicle] = useState('Charger');

  return (
    <div className="w-full h-[400px] bg-black bg-opacity-20 rounded-xl flex items-center justify-center p-8">
      <div className="flex flex-col items-center space-y-4">
        <iframe
          src={vehicleModels[selectedVehicle]}  // Dynamically load the selected model
          frameBorder="0"
          width="90%"
          height="350px"
          allow="autoplay; fullscreen"
          className="rounded-lg shadow-lg"
        />
        <p className="text-2xl text-white font-semibold">Visualizer for: {selectedVehicle}</p>

        <select
          onChange={(e) => setSelectedVehicle(e.target.value)}
          value={selectedVehicle}
          className="bg-black text-white p-3 rounded-lg border-2 border-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="Charger">Charger</option>
          <option value="Mustang">Mustang</option>
          <option value="Camaro">Camaro</option>
        </select>
      </div>
    </div>
  );
}