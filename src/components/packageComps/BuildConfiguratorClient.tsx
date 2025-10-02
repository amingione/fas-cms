import React, { useMemo, useState } from 'react';
import type { Product } from '@lib/sanity-utils';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface Props {
  products: Product[];
}

function normalizeTags(arr?: any[]): string[] {
  return Array.isArray(arr)
    ? arr
        .map((v) =>
          String(v || '')
            .trim()
            .toLowerCase()
        )
        .filter(Boolean)
    : [];
}

export default function BuildConfiguratorClient({ products }: Props) {
  const [vehicle, setVehicle] = useState<string>('trackhawk');
  const [submitting, setSubmitting] = useState(false);
  const [build, setBuild] = useState<Record<string, { p: Product; qty: number }>>({});
  const [openAttrKey, setOpenAttrKey] = useState<string | null>(null);
  const [openSpecKey, setOpenSpecKey] = useState<string | null>(null);
  const [selectedAttrFacets, setSelectedAttrFacets] = useState<Record<string, string[]>>({});
  const [selectedSpecFacets, setSelectedSpecFacets] = useState<Record<string, string[]>>({});

  const variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
  };

  const extractAttrPairs = (p: any) =>
    (Array.isArray(p?.attributes) ? p.attributes : [])
      .map((raw: any) => ({
        key: String(raw?.key ?? raw?.label ?? raw?.name ?? '').trim(),
        value: String(raw?.value ?? raw?.detail ?? raw?.name ?? '').trim()
      }))
      .filter((x: any) => x.key && x.value);

  const extractSpecPairs = (p: any) =>
    (Array.isArray(p?.specifications) ? p.specifications : [])
      .map((raw: any) => ({
        key: String(raw?.key ?? raw?.label ?? raw?.name ?? '').trim(),
        value: String(raw?.value ?? raw?.detail ?? raw?.name ?? '').trim()
      }))
      .filter((x: any) => x.key && x.value);

  const attrFacets: Record<string, string[]> = useMemo(() => {
    const map = new Map<string, Set<string>>();
    products.forEach((p: any) => {
      extractAttrPairs(p).forEach(({ key, value }: { key: string; value: string }) => {
        if (!map.has(key)) map.set(key, new Set());
        map.get(key)!.add(value);
      });
    });
    const out: Record<string, string[]> = {};
    map.forEach((vals, k) => (out[k] = Array.from(vals).sort()));
    return out;
  }, [products]);

  const specFacets: Record<string, string[]> = useMemo(() => {
    const map = new Map<string, Set<string>>();
    products.forEach((p: any) => {
      extractSpecPairs(p).forEach(({ key, value }: { key: string; value: string }) => {
        if (!map.has(key)) map.set(key, new Set());
        map.get(key)!.add(value);
      });
    });
    const out: Record<string, string[]> = {};
    map.forEach((vals, k) => (out[k] = Array.from(vals).sort()));
    return out;
  }, [products]);

  const filteredProducts = useMemo(() => {
    const v = vehicle.toLowerCase();
    const vehicleTokens = VEHICLES.find((x) => x.id === v)?.tokens || [];
    const activeAttrKeys = Object.keys(selectedAttrFacets).filter(
      (k) => selectedAttrFacets[k].length > 0
    );
    const activeSpecKeys = Object.keys(selectedSpecFacets).filter(
      (k) => selectedSpecFacets[k].length > 0
    );
    return products.filter((p: any) => {
      const comp = p?.compatibleVehicles || [];
      const hasVehicle =
        comp.some((cv: any) => {
          const slugMatch = String(cv?.slug?.current || cv?.slug || '').toLowerCase() === v;
          const model = String(cv?.model || '').toLowerCase();
          const make = String(cv?.make || '').toLowerCase();
          const tokenMatch = vehicleTokens.some((t) => model.includes(t) || make.includes(t));
          return slugMatch || tokenMatch;
        }) || normalizeTags(p?.filters).some((t) => vehicleTokens.includes(t));
      if (!hasVehicle) return false;

      if (activeAttrKeys.length > 0) {
        const pairs = extractAttrPairs(p);
        for (const key of activeAttrKeys) {
          const selected = selectedAttrFacets[key];
          if (
            !pairs.some(
              (pair: { key: string; value: string }) =>
                pair.key === key && selected.includes(pair.value)
            )
          )
            return false;
        }
      }

      if (activeSpecKeys.length > 0) {
        const pairs = extractSpecPairs(p);
        for (const key of activeSpecKeys) {
          const selected = selectedSpecFacets[key];
          if (
            !pairs.some(
              (pair: { key: string; value: string }) =>
                pair.key === key && selected.includes(pair.value)
            )
          )
            return false;
        }
      }
      return true;
    });
  }, [products, selectedAttrFacets, selectedSpecFacets, vehicle]);

  const subtotal = Object.values(build).reduce(
    (acc, { p, qty }) => acc + (Number(p.price) || 0) * qty,
    0
  );

  const addToBuild = (p: Product) => {
    setBuild((prev) => {
      const id = p._id;
      const next = { ...prev };
      next[id] = { p, qty: (prev[id]?.qty || 0) + 1 };
      return next;
    });
  };

  const removeFromBuild = (id: string) =>
    setBuild((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

  const updateQty = (id: string, qty: number) =>
    setBuild((prev) => {
      const next = { ...prev };
      if (next[id]) next[id].qty = Math.max(1, qty || 1);
      return next;
    });

  const submitQuote = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: fd.get('name') as string,
      email: fd.get('email') as string,
      phone: fd.get('phone') as string,
      vehicle,
      items: Object.entries(build).map(([, { p, qty }]) => ({
        id: p._id,
        name: p.title || 'Item',
        price: Number(p.price) || 0,
        qty
      })),
      subtotal,
      notes: fd.get('notes') as string
    };
    if (!payload.items.length) return alert('Add at least one product.');
    setSubmitting(true);
    try {
      const res = await fetch('/api/build-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as any)?.message || 'Request failed');
      }
      const message = (data as any)?.message || 'Quote submitted!';
      const ref = (data as any)?.quoteRequestId;
      alert(ref ? `${message}\nReference: ${ref}` : message);
    } catch (err) {
      alert('Error submitting quote.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleAttrFacetValue = (key: string, value: string) =>
    setSelectedAttrFacets((prev) => {
      const selected = prev[key] || [];
      const next = { ...prev };
      next[key] = selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value];
      return next;
    });

  const toggleSpecFacetValue = (key: string, value: string) =>
    setSelectedSpecFacets((prev) => {
      const selected = prev[key] || [];
      const next = { ...prev };
      next[key] = selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value];
      return next;
    });

  return (
    <section className="py-20 md:py-32 bg-gradient-to-br from-background to-gray-900 relative overflow-hidden">
      <div className="absolute inset-0 grain-overlay opacity-10" />
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <motion.div
          className="text-center space-y-6 mb-12 md:mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={variants}
        >
          <h2 className="text-4xl md:text-6xl font-display font-bold text-text">
            Configure Your Build
          </h2>
          <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto">
            Select your vehicle and components to create a custom performance package.
          </p>
        </motion.div>

        <motion.div
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory px-1 md:px-0 md:grid md:grid-cols-5 md:gap-4 md:overflow-visible mb-12"
          variants={variants}
        >
          {VEHICLES.map((v) => (
            <motion.button
              key={v.id}
              onClick={() => setVehicle(v.id)}
              className={`snap-start flex-none w-[12rem] md:w-auto p-4 rounded-xl bg-gray-900/50 backdrop-blur-sm border ${vehicle === v.id ? 'border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'border-gray-800'} hover:border-blue-400 transition-all`}
              whileHover={{ scale: 1.05 }}
            >
              <img
                src={v.image}
                alt={v.label}
                className="w-full h-28 md:h-32 object-cover rounded-lg mb-3"
              />
              <span className="text-sm md:text-base font-medium text-text">{v.label}</span>
            </motion.button>
          ))}
        </motion.div>

        {Object.keys(build).length > 0 && (
          <motion.div
            className="bg-gray-900/50 backdrop-blur-sm p-6 rounded-xl mb-12"
            variants={variants}
          >
            <h3 className="text-xl md:text-2xl font-medium mb-4 text-text">Your Build</h3>
            <div className="space-y-4">
              {Object.entries(build).map(([id, { p, qty }]) => (
                <div key={id} className="flex justify-between items-center text-gray-400">
                  <span>
                    {p.title} x {qty}
                  </span>
                  <div className="flex gap-3">
                    <input
                      type="number"
                      value={qty}
                      onChange={(e) => updateQty(id, parseInt(e.target.value))}
                      className="w-16 bg-gray-800/50 border-gray-700 rounded p-2 text-text"
                    />
                    <button
                      onClick={() => removeFromBuild(id)}
                      className="text-red-400 hover:text-red-500"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              <div className="text-right text-xl font-bold text-blue-400">
                Subtotal: ${subtotal.toFixed(2)}
              </div>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-12">
          <motion.div className="lg:col-span-1 space-y-6" variants={variants}>
            <details className="bg-gray-900/50 backdrop-blur-sm p-4 rounded-xl">
              <summary className="flex justify-between items-center cursor-pointer text-text">
                <span className="text-lg font-medium">Attributes</span>
                <button onClick={() => setSelectedAttrFacets({})} className="text-blue-400">
                  Clear
                </button>
              </summary>
              {Object.entries(attrFacets).map(([key, values]) => (
                <div key={key} className="mt-4">
                  <button
                    onClick={() => setOpenAttrKey(openAttrKey === key ? null : key)}
                    className="w-full text-left p-3 bg-gray-800/50 rounded-lg text-text"
                  >
                    {key}{' '}
                    {selectedAttrFacets[key]?.length ? `(${selectedAttrFacets[key].length})` : ''}
                  </button>
                  {openAttrKey === key && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {values.map((v) => (
                        <button
                          key={v}
                          onClick={() => toggleAttrFacetValue(key, v)}
                          className={`px-3 py-1 rounded-full ${selectedAttrFacets[key]?.includes(v) ? 'bg-blue-600 text-white' : 'bg-gray-800/50 text-gray-400'} hover:bg-blue-600/80 transition-all`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </details>
            <details className="bg-gray-900/50 backdrop-blur-sm p-4 rounded-xl">
              <summary className="flex justify-between items-center cursor-pointer text-text">
                <span className="text-lg font-medium">Specifications</span>
                <button onClick={() => setSelectedSpecFacets({})} className="text-blue-400">
                  Clear
                </button>
              </summary>
              {Object.entries(specFacets).map(([key, values]) => (
                <div key={key} className="mt-4">
                  <button
                    onClick={() => setOpenSpecKey(openSpecKey === key ? null : key)}
                    className="w-full text-left p-3 bg-gray-800/50 rounded-lg text-text"
                  >
                    {key}{' '}
                    {selectedSpecFacets[key]?.length ? `(${selectedSpecFacets[key].length})` : ''}
                  </button>
                  {openSpecKey === key && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {values.map((v) => (
                        <button
                          key={v}
                          onClick={() => toggleSpecFacetValue(key, v)}
                          className={`px-3 py-1 rounded-full ${selectedSpecFacets[key]?.includes(v) ? 'bg-blue-600 text-white' : 'bg-gray-800/50 text-gray-400'} hover:bg-blue-600/80 transition-all`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </details>
          </motion.div>

          <motion.div
            className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={variants}
          >
            {filteredProducts.map((p) => (
              <motion.div
                key={p._id}
                className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4"
                whileHover={{ scale: 1.03, boxShadow: '0 0 20px rgba(59,130,246,0.3)' }}
              >
                <img
                  src={
                    typeof p.images?.[0] === 'string'
                      ? p.images[0]
                      : p.images?.[0]?.asset?.url || '/logo/faslogochroma.png'
                  }
                  alt={p.title}
                  className="w-full h-48 object-cover rounded-lg mb-4"
                />
                <h4 className="text-lg font-medium text-text mb-2">{p.title}</h4>
                <p className="text-blue-400 font-bold mb-4">${p.price?.toFixed(2)}</p>
                <Button
                  onClick={() => addToBuild(p)}
                  className="w-full bg-blue-600 hover:bg-blue-700 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.4)]"
                >
                  Add to Build
                </Button>
              </motion.div>
            ))}
          </motion.div>
        </div>

        <motion.form
          onSubmit={submitQuote}
          className="sticky bottom-4 bg-gray-900/50 backdrop-blur-sm p-6 rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.3)]"
          variants={variants}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <input
              name="name"
              placeholder="Your Name"
              required
              className="bg-gray-800/50 border-gray-700 rounded-lg p-3 text-text"
            />
            <input
              name="email"
              type="email"
              placeholder="Email"
              required
              className="bg-gray-800/50 border-gray-700 rounded-lg p-3 text-text"
            />
            <input
              name="phone"
              placeholder="Phone"
              className="bg-gray-800/50 border-gray-700 rounded-lg p-3 text-text sm:col-span-2"
            />
            <textarea
              name="notes"
              placeholder="Notes / Goals"
              rows={4}
              className="bg-gray-800/50 border-gray-700 rounded-lg p-3 text-text sm:col-span-2"
            />
          </div>
          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.4)]"
          >
            {submitting ? 'Submitting...' : 'Submit for Quote'}
          </Button>
        </motion.form>
      </div>
    </section>
  );
}

const VEHICLES = [
  {
    id: 'trackhawk',
    label: 'Jeep Trackhawk',
    image: '/images/packages/jeep trackhawk 900 package.png',
    tokens: ['trackhawk', 'jeep']
  },
  {
    id: 'hellcat-durango',
    label: 'Hellcat Durango',
    image: '/images/packages/850-ram.webp',
    tokens: ['hellcat', 'durango']
  },
  {
    id: 'redeye',
    label: 'Redeye / Demon',
    image: '/images/packages/challenger FAS.png',
    tokens: ['redeye', 'demon', 'challenger', 'charger']
  },
  {
    id: 'raptor-r',
    label: 'Raptor R',
    image: '/images/packages/D-FAS-TRX-Package.png',
    tokens: ['raptor', 'raptor-r']
  },
  {
    id: 'trx',
    label: 'Ram TRX',
    image: '/images/packages/850-ram.webp',
    tokens: ['trx', 'ram']
  }
];
