import { useState, useEffect } from 'react';
import { client } from '../lib/sanityClient';

export default function QuoteSidebar({ selectedHP = 700 }) {
  const [price, setPrice] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [carModel, setCarModel] = useState('Charger');

  useEffect(() => {
    // Example pricing logic: $50 per HP over 600
    const basePrice = 2000;
    const additional = Math.max(0, selectedHP - 600) * 50;
    setPrice(basePrice + additional);
  }, [selectedHP]);

  return (
    <aside className="bg-white bg-opacity-5 backdrop-blur-md text-white p-6 rounded-xl shadow-xl sticky top-6 space-y-6">
      <h2 className="text-2xl font-bold">Your Build Summary</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-white/10 rounded p-2 text-white border border-white/20"
            placeholder="John Doe"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-white/10 rounded p-2 text-white border border-white/20"
            placeholder="you@email.com"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Car Model</label>
          <select
            value={carModel}
            onChange={(e) => setCarModel(e.target.value)}
            className="w-full bg-white/10 rounded p-2 text-white border border-white/20"
          >
            <option value="Charger">Charger</option>
            <option value="Challenger">Challenger</option>
            <option value="TRX">TRX</option>
            <option value="Trackhawk">Trackhawk</option>
            <option value="Durango">Durango</option>
            <option value="Mustang">Mustang</option>
            <option value="Raptor">Raptor</option>
            <option value="Shelby Truck">Shelby Truck</option>
            <option value="F150">F150</option>
            <option value="F250">F250</option>
            <option value="F350">F350</option>
            <option value="F450">F450</option>
          </select>
        </div>

        <div className="flex justify-between">
          <span>Selected Horsepower:</span>
          <span>{selectedHP} whp</span>
        </div>
        <div className="flex justify-between">
          <span>Estimated Price:</span>
          <span>${price.toLocaleString()}</span>
        </div>
      </div>

      <button
        className="w-full bg-blue-600 hover:bg-blue-700 transition-colors py-2 px-4 rounded-lg font-semibold"
        onClick={async () => {
          const quote = {
            _type: 'quote',
            name,
            email,
            horsepower: selectedHP,
            price: price,
            carModel
          };

          try {
            await client.create(quote);
            alert('Quote submitted to FAS Motorsports!');
          } catch (err) {
            console.error('Sanity submit error:', err);
            alert('There was an error submitting your quote. Try again.');
          }
        }}
      >
        Request My Build Quote
      </button>
    </aside>
  );
}
