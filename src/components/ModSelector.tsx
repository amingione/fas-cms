import { useEffect, useState } from 'react';
import { createClient } from '@sanity/client';

const client = createClient({
  projectId: 'r4og35qd',
  dataset: 'production',
  useCdn: true,
  apiVersion: '2023-07-27',
});

type ModItem = {
  _id: string;
  name: string;
  description: string;
  hpGain: number;
  price: number;
  cost: number;
  category?: { title: string };
};

export default function ModSelector() {
  const [mods, setMods] = useState<ModItem[]>([]);
  const [selectedMods, setSelectedMods] = useState<ModItem[]>([]);
  const [filter, setFilter] = useState<string>('All');

  useEffect(() => {
    client
      .fetch(
        `*[_type == "modListItem"]{
          _id,
          name,
          description,
          hpGain,
          price,
          cost,
          category->{title}
        }`
      )
      .then(setMods);
  }, []);

  const categories: string[] = ['All', ...new Set(mods.map((mod) => mod.category?.title || '').filter(Boolean))];

  const toggleMod = (mod: ModItem) => {
    setSelectedMods((prev) =>
      prev.find((m) => m._id === mod._id)
        ? prev.filter((m) => m._id !== mod._id)
        : [...prev, mod]
    );
  };

  const filteredMods =
    filter === 'All' ? mods : mods.filter((mod) => mod.category?.title === filter);

  const totalHp = selectedMods.reduce((sum, m) => sum + m.hpGain, 0);
  const totalCost = selectedMods.reduce((sum, m) => sum + m.price, 0);

  const handleSaveBuild = async () => {
    const buildData = {
      _type: 'buildQuote',
      createdAt: new Date().toISOString(),
      totalHpGain: totalHp,
      totalCost: totalCost,
      mods: selectedMods.map((mod) => ({
        _type: 'reference',
        _ref: mod._id,
      })),
    };

    try {
      await client.create(buildData);
      alert('Build saved successfully to your garage!');
    } catch (err) {
      console.error('Failed to save build:', err);
      alert('An error occurred while saving the build.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto text-white px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Select Your Modifications</h1>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-4 py-1 rounded-full border font-bold transition-all duration-200 ${
              filter === cat
                ? 'bg-red-600 text-white border-red-400'
                : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Mod Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {filteredMods.map((mod) => {
          const isSelected = selectedMods.some((m) => m._id === mod._id);
          return (
            <div
              key={mod._id}
              className={`p-4 border rounded-lg shadow-sm hover:shadow-lg transition-all ${
                isSelected ? 'border-red-500 bg-gray-800/60' : 'bg-gray-900 hover:bg-gray-800'
              }`}
            >
              <h3 className="text-lg font-semibold flex items-center gap-2">
                {mod.name}
                <span title={mod.description} className="cursor-help text-blue-400">ℹ️</span>
              </h3>
              <p className="text-sm text-gray-400 mb-2">{mod.description}</p>
              <p>💥 +{mod.hpGain} HP</p>
              <p>💰 ${mod.price}</p>
              <button
                className={`mt-2 px-4 py-1 text-sm rounded font-semibold ${
                  isSelected
                    ? 'bg-red-700 text-white hover:bg-red-800'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
                onClick={() => toggleMod(mod)}
              >
                {isSelected ? 'Remove' : 'Add'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Build Summary */}
      <div className="mt-10 border-t pt-6">
        <h2 className="text-xl font-semibold mb-2">Build Summary</h2>
        {selectedMods.length === 0 ? (
          <p className="text-gray-400">No mods selected yet.</p>
        ) : (
          <>
            <ul className="list-disc list-inside text-sm mb-2">
              {selectedMods.map((mod) => (
                <li key={mod._id}>
                  {mod.name} — +{mod.hpGain} HP — ${mod.price}
                </li>
              ))}
            </ul>
            <p className="mt-2 font-medium">
              Total Gain: <span className="text-green-400">+{totalHp} HP</span> | Total: ${totalCost}
            </p>
          </>
        )}
      </div>

      {selectedMods.length > 0 && (
        <button
          onClick={handleSaveBuild}
          className="mt-4 px-6 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700"
        >
          Save This Build to My Garage
        </button>
      )}
    </div>
  );
}
