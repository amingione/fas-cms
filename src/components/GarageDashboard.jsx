import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const GarageDashboard = ({ savedBuilds }) => {
  const [filtered, setFiltered] = useState(savedBuilds);
  const [selectedModel, setSelectedModel] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
    if (selectedModel === 'All') {
      setFiltered(savedBuilds);
    } else {
      setFiltered(savedBuilds.filter((b) => b.vehicleModel === selectedModel));
    }
  }, [savedBuilds, selectedModel]);

  const uniqueModels = ['All', ...new Set(savedBuilds.map((b) => b.vehicleModel))];

  return (
    <div className="mt-12">
      <h2 className="text-3xl font-bold text-red-500 mb-6 text-center">🛠️ Your Garage Builds</h2>

      <div className="flex flex-wrap justify-center gap-3 mb-8">
        {uniqueModels.map((model) => (
          <button
            key={model}
            onClick={() => setSelectedModel(model)}
            className={`px-4 py-2 rounded-full font-semibold tracking-wide transition duration-200 ${
              selectedModel === model
                ? 'bg-red-600 text-white shadow-md'
                : 'bg-gray-800 text-gray-300 hover:bg-red-700 hover:text-white'
            }`}
          >
            {model}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-center text-gray-400 text-lg animate-pulse">Loading builds...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-gray-400">No builds found for selected model.</p>
      ) : (
        <ul className="space-y-6">
          {filtered.map((build, index) => (
            <li
              key={index}
              className="bg-gradient-to-br from-black to-gray-900 border border-gray-800 p-6 rounded-lg shadow-xl"
            >
              <h3 className="text-xl font-bold text-white mb-2">{build.vehicleModel}</h3>
              <p className="text-gray-300"><strong>Mods:</strong> {build.modifications}</p>
              <p className="text-gray-300"><strong>Horsepower:</strong> {build.horsepower} whp</p>
              <p className="text-green-400 font-semibold">
                <strong>Price:</strong> ${Number(build.price).toLocaleString()}
              </p>

              <div className="mt-3 text-sm text-gray-400 italic">
                <strong>Add-ons:</strong> {build.addOns || 'No additional upgrades'}
              </div>

              <div className="mt-4 text-sm text-white">
                <strong>Build List:</strong>
                {Array.isArray(build.modList) && build.modList.length > 0 ? (
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    {build.modList.map((mod, i) => (
                      <li key={i} className="flex justify-between items-center text-sm">
                        <span>{mod.name} (+{mod.hpGain} hp)</span>
                        <button
                          className="text-red-400 hover:text-red-600 text-xs ml-2"
                          onClick={() => alert(`Remove ${mod.name} from build`)}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-400">No mods in build list.</p>
                )}
              </div>

              <div className="mt-2 text-sm text-green-400">
                <strong>Total HP Gain:</strong>{' '}
                {Array.isArray(build.modList)
                  ? build.modList.reduce((sum, mod) => sum + (mod.hpGain || 0), 0)
                  : 0} hp
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="text-center mt-12">
        <Link
          to="/build"
          className="inline-block bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-md transition"
        >
          + Start New Build
        </Link>
      </div>
    </div>
  );
};

export default GarageDashboard;