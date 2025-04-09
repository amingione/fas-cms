import React, { useState, useEffect } from 'react';
import { createClient } from '@sanity/client';

const sanity = createClient({
  projectId: 'r4og35qd',
  dataset: 'production',
  apiVersion: '2023-01-01',
  token: import.meta.env.PUBLIC_SANITY_WRITE_TOKEN,
  useCdn: false,
});

export default function BuildComponent({ onSubmit }) {
  const [vehicleModel, setVehicleModel] = useState('');
  const [horsepower, setHorsepower] = useState('');
  const [modList, setModList] = useState([]);
  const [modOptions, setModOptions] = useState([]);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const fetchModOptions = async () => {
      try {
        const mods = await sanity.fetch(`*[_type == "modListItem"]{name, hpGain, price}`);
        setModOptions(mods);
      } catch (err) {
        console.error('Failed to load mod options from Sanity:', err);
      }
    };
    fetchModOptions();
  }, []);

  useEffect(() => {
    if (submitted) {
      const timeout = setTimeout(() => setSubmitted(false), 3000);
      return () => clearTimeout(timeout);
    }
  }, [submitted]);

  const handleAddMod = (mod) => {
    if (!modList.find((m) => m.name === mod.name)) {
      setModList([...modList, mod]);
    }
  };

  const handleRemoveMod = (modName) => {
    setModList(modList.filter((m) => m.name !== modName));
  };

  const totalHpGain = modList.reduce((sum, mod) => sum + mod.hpGain, 0);
  const totalHorsepower = parseInt(horsepower || 0) + totalHpGain;
  const totalModPrice = modList.reduce((sum, mod) => sum + (mod.price || 0), 0);
  const totalPrice = totalModPrice + totalHorsepower * 10;

  const handleSubmit = async (e) => {
    e.preventDefault();

    const data = {
      vehicleModel,
      modifications: modList.map((m) => m.name).join(', '),
      horsepower: parseInt(horsepower, 10),
      modList,
    };

    try {
      await sanity.create({
        _type: 'buildQuote',
        vehicleModel: data.vehicleModel,
        modifications: data.modifications,
        horsepower: data.horsepower,
        price: totalPrice,
        modList: data.modList,
      });

      onSubmit(data);
      setSubmitted(true);
      setVehicleModel('');
      setHorsepower('');
      setModList([]);
    } catch (err) {
      console.error('Sanity submission failed:', err);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 bg-black p-6 rounded-lg border border-red-600 shadow-lg"
    >
      <div>
        <label className="block mb-2 text-sm font-medium text-red-300 uppercase tracking-wide">
          Vehicle Model
        </label>
        <input
          type="text"
          value={vehicleModel}
          onChange={(e) => setVehicleModel(e.target.value)}
          className="w-full px-4 py-2 border border-gray-700 bg-gray-900 text-white rounded focus:outline-none focus:ring-2 focus:ring-red-500"
          required
        />
      </div>

      <div>
        <label className="block mb-2 text-sm font-medium text-red-300 uppercase tracking-wide">
          Base Horsepower
        </label>
        <input
          type="number"
          value={horsepower}
          onChange={(e) => setHorsepower(e.target.value)}
          className="w-full px-4 py-2 border border-gray-700 bg-gray-900 text-white rounded focus:outline-none focus:ring-2 focus:ring-red-500"
          required
        />
      </div>

      <div>
        <label className="block mb-2 text-sm font-medium text-red-300 uppercase tracking-wide">
          Select Modifications
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {modOptions.map((mod) => (
            <button
              type="button"
              key={mod.name}
              onClick={() => handleAddMod(mod)}
              className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-red-700 border border-gray-700"
            >
              {mod.name} (+{mod.hpGain} hp) — ${mod.price}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block mb-2 text-sm font-medium text-red-300 uppercase tracking-wide">
          Selected Mods
        </label>
        <ul className="space-y-2">
          {modList.length === 0 && <li className="text-gray-500">No mods selected yet.</li>}
          {modList.map((mod) => (
            <li
              key={mod.name}
              className="flex justify-between bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white"
            >
              <span>{mod.name} (+{mod.hpGain} hp) — ${mod.price}</span>
              <button
                type="button"
                onClick={() => handleRemoveMod(mod.name)}
                className="text-red-400 hover:text-red-600"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="text-green-400 font-semibold text-right">
        Total Estimated Horsepower: {totalHorsepower} hp
      </div>
      <div className="text-yellow-400 font-semibold text-right">
        Total Estimated Price: ${totalPrice.toLocaleString()}
      </div>

      <button
        type="submit"
        className="w-full mt-4 bg-red-600 hover:bg-red-700 px-6 py-3 rounded-md text-white font-bold tracking-wide transition-colors duration-200"
      >
        Save Quote
      </button>

      {submitted && (
        <div className="text-green-400 font-semibold text-center mt-4 animate-bounce">
          Quote Saved!
        </div>
      )}
    </form>
  );
}