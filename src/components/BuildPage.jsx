import React, { useState } from 'react';

const BuildPage = ({ onSubmit }) => {
  const [vehicleModel, setVehicleModel] = useState('');
  const [modifications, setModifications] = useState('');
  const [horsepower, setHorsepower] = useState(0);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Call the onSubmit prop to send the data
    onSubmit({ vehicleModel, modifications, horsepower });
  };

  return (
    <div className="build-quote-form">
      <h2 className="text-2xl font-bold mb-6">Build Your Quote</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Vehicle Model */}
        <div className="form-group">
          <label htmlFor="vehicleModel" className="block text-sm font-medium text-white">Vehicle Model</label>
          <input
            type="text"
            id="vehicleModel"
            value={vehicleModel}
            onChange={(e) => setVehicleModel(e.target.value)}
            className="mt-1 block w-full p-2 bg-transparent border-b-2 border-white text-white"
            placeholder="Enter vehicle model (e.g., Charger)"
            required
          />
        </div>

        {/* Modifications */}
        <div className="form-group">
          <label htmlFor="modifications" className="block text-sm font-medium text-white">Modifications</label>
          <textarea
            id="modifications"
            value={modifications}
            onChange={(e) => setModifications(e.target.value)}
            className="mt-1 block w-full p-2 bg-transparent border-b-2 border-white text-white"
            placeholder="Enter custom modifications"
            rows="4"
          />
        </div>

        {/* Horsepower */}
        <div className="form-group">
          <label htmlFor="horsepower" className="block text-sm font-medium text-white">Horsepower</label>
          <input
            type="number"
            id="horsepower"
            value={horsepower}
            onChange={(e) => setHorsepower(e.target.value)}
            className="mt-1 block w-full p-2 bg-transparent border-b-2 border-white text-white"
            placeholder="Enter horsepower"
            required
          />
        </div>

        {/* Submit Button */}
        <div className="form-group text-center">
          <button
            type="submit"
            className="bg-accent text-white px-6 py-2 rounded-md hover:bg-accent-dark"
          >
            Get Quote
          </button>
        </div>
      </form>
    </div>
  );
};

export default BuildPage;