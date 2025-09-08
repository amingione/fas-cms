import React, { useMemo, useState } from 'react';
import type { Product } from '@lib/sanity-utils';

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

  // Build state: product id -> { product, qty }
  const [build, setBuild] = useState<Record<string, { p: Product; qty: number }>>({});

  // Faceted filters (separate sections)
  const [openAttrKey, setOpenAttrKey] = useState<string | null>(null);
  const [openSpecKey, setOpenSpecKey] = useState<string | null>(null);
  const [selectedAttrFacets, setSelectedAttrFacets] = useState<Record<string, string[]>>({});
  const [selectedSpecFacets, setSelectedSpecFacets] = useState<Record<string, string[]>>({});

  // Helpers for extracting normalized pairs
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
    (Array.isArray(products) ? products : []).forEach((p: any) => {
      extractAttrPairs(p).forEach(({ key, value }: { key: string; value: string }) => {
        if (!map.has(key)) map.set(key, new Set());
        map.get(key)!.add(value);
      });
    });
    const out: Record<string, string[]> = {};
    for (const [k, vals] of map.entries()) out[k] = Array.from(vals.values()).sort();
    return out;
  }, [products]);

  const specFacets: Record<string, string[]> = useMemo(() => {
    const map = new Map<string, Set<string>>();
    (Array.isArray(products) ? products : []).forEach((p: any) => {
      extractSpecPairs(p).forEach(({ key, value }: { key: string; value: string }) => {
        if (!map.has(key)) map.set(key, new Set());
        map.get(key)!.add(value);
      });
    });
    const out: Record<string, string[]> = {};
    for (const [k, vals] of map.entries()) out[k] = Array.from(vals.values()).sort();
    return out;
  }, [products]);

  const filteredProducts = useMemo(() => {
    const v = (vehicle || 'trackhawk').toLowerCase();
    const vehicleTokens = VEHICLES.find((x) => x.id === v)?.tokens || [];
    const activeAttrKeys = Object.keys(selectedAttrFacets).filter(
      (k) => (selectedAttrFacets[k] || []).length > 0
    );
    const activeSpecKeys = Object.keys(selectedSpecFacets).filter(
      (k) => (selectedSpecFacets[k] || []).length > 0
    );
    return (Array.isArray(products) ? products : []).filter((p: any) => {
      // Vehicle filter: compatibleVehicles slug/model/make OR product.filters tokens
      const comp = Array.isArray(p?.compatibleVehicles) ? p.compatibleVehicles : [];
      const hasVehicle =
        comp.some((cv: any) => {
          const slugMatch = String(cv?.slug?.current || cv?.slug || '').toLowerCase() === v;
          const model = String(cv?.model || '').toLowerCase();
          const make = String(cv?.make || '').toLowerCase();
          const tokenMatch = vehicleTokens.some((t) => model.includes(t) || make.includes(t));
          return slugMatch || tokenMatch;
        }) || normalizeTags(p?.filters).some((t) => vehicleTokens.includes(t));
      if (!hasVehicle) return false;

      // Attribute filters (AND across keys, OR within values)
      if (activeAttrKeys.length > 0) {
        const pairs = extractAttrPairs(p);
        for (const key of activeAttrKeys) {
          const selected = selectedAttrFacets[key];
          const ok = pairs.some(
            (pair: { key: string; value: string }) =>
              pair.key === key && selected.includes(pair.value)
          );
          if (!ok) return false;
        }
      }
      // Specification filters (AND across keys, OR within values)
      if (activeSpecKeys.length > 0) {
        const pairs = extractSpecPairs(p);
        for (const key of activeSpecKeys) {
          const selected = selectedSpecFacets[key];
          const ok = pairs.some(
            (pair: { key: string; value: string }) =>
              pair.key === key && selected.includes(pair.value)
          );
          if (!ok) return false;
        }
      }
      return true;
    });
  }, [products, selectedAttrFacets, selectedSpecFacets, vehicle]);

  const subtotal = Object.values(build).reduce(
    (acc, { p, qty }) => acc + (Number((p as any).price) || 0) * qty,
    0
  );

  const addToBuild = (p: Product) => {
    setBuild((prev) => {
      const id = (p as any)._id;
      const next = { ...prev } as typeof prev;
      if (!id) return prev;
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

  async function submitQuote(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload = {
      name: String(fd.get('name') || ''),
      email: String(fd.get('email') || ''),
      phone: String(fd.get('phone') || ''),
      vehicle,
      items: Object.entries(build).map(([id, { p, qty }]) => ({
        id,
        name: (p as any).title || 'Item',
        price: Number((p as any).price || 0) || 0,
        qty
      })),
      subtotal,
      notes: String(fd.get('notes') || '')
    };
    if (!payload.items.length) {
      alert('Please add at least one product to your build.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/build-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to submit');
      alert('Your build was sent! We will contact you shortly.');
      setBuild({});
      form.reset();
    } catch (err) {
      console.error(err);
      alert('Sorry, something went wrong submitting your build.');
    } finally {
      setSubmitting(false);
    }
  }

  const clearAllFacets = () => {
    setSelectedAttrFacets({});
    setSelectedSpecFacets({});
  };
  const toggleAttrFacetValue = (key: string, value: string) => {
    setSelectedAttrFacets((prev) => {
      const current = prev[key] || [];
      const exists = current.includes(value);
      const nextVals = exists ? current.filter((v) => v !== value) : [...current, value];
      const next = { ...prev, [key]: nextVals } as Record<string, string[]>;
      if (next[key].length === 0) delete next[key];
      return next;
    });
  };
  const toggleSpecFacetValue = (key: string, value: string) => {
    setSelectedSpecFacets((prev) => {
      const current = prev[key] || [];
      const exists = current.includes(value);
      const nextVals = exists ? current.filter((v) => v !== value) : [...current, value];
      const next = { ...prev, [key]: nextVals } as Record<string, string[]>;
      if (next[key].length === 0) delete next[key];
      return next;
    });
  };

  // No legacy category/tag panel; filtering is via attributes/specs only

  return (
    <>
      <div className="space-y-6 mt-5">
        {/* Vehicle Picker */}
        <section>
          <h3 className="font-ethno text-accent text-lg mb-2">Select Your Vehicle</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {VEHICLES.map((v) => (
              <button
                key={v.id}
                type="button"
                className={
                  'group rounded-lg border p-2 bg-black/30 hover:bg-black/40 transition ' +
                  (vehicle === v.id ? 'border-primary text-primary' : 'border-white/15 text-white')
                }
                onClick={() => setVehicle(v.id)}
              >
                <div className="w-full aspect-video grid place-items-center overflow-hidden rounded mb-1 bg-black/20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={v.image}
                    alt={v.label}
                    className="object-contain max-w-full max-h-full"
                  />
                </div>
                <div className="text-xs sm:text-sm font-medium">{v.label}</div>
              </button>
            ))}
          </div>
        </section>

        {/* Build Summary */}
        <section className="space-y-3 bg-black/30 border border-white/10 rounded-2xl p-4">
          <h3 className="font-ethno text-lg">Your Build</h3>
          {Object.keys(build).length === 0 ? (
            <p className="text-white/70">No items yet.</p>
          ) : (
            <div className="space-y-2">
              {Object.values(build).map(({ p, qty }) => {
                const id = (p as any)._id;
                return (
                  <div
                    key={id}
                    className="flex items-center justify-between border border-white/10 rounded px-3 py-2"
                  >
                    <div className="text-sm">{(p as any).title}</div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        value={qty}
                        onChange={(e) => updateQty(id, parseInt(e.target.value) || 1)}
                        className="w-14 text-black px-1 rounded"
                      />
                      <div className="text-accent font-bold text-sm">
                        {typeof (p as any).price === 'number'
                          ? `$${((p as any).price * qty).toFixed(2)}`
                          : '—'}
                      </div>
                      <button
                        onClick={() => removeFromBuild(id)}
                        className="text-red-400 hover:text-red-600"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center justify-between border-t border-white/10 pt-2">
                <span className="font-bold">Subtotal</span>
                <span className="text-accent font-bold">${subtotal.toFixed(2)}</span>
              </div>
            </div>
          )}
        </section>

        {/* Facets + Results (products) */}
        <div className="space-y-3">
          {/* Dropdown: Attributes */}
          <details className="bg-black/30 border border-white/10 rounded-2xl p-4 space-y-3">
            <summary className="flex items-center justify-between cursor-pointer list-none">
              <span className="font-ethno text-base">Filter By Attributes</span>
              <button
                type="button"
                className="text-xs text-white/70 hover:text-white"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedAttrFacets({});
                  setOpenAttrKey(null);
                }}
              >
                Clear
              </button>
            </summary>
            {Object.keys(attrFacets).length === 0 ? (
              <p className="text-sm text-white/60">No attributes available.</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(attrFacets).map(([key, values]) => (
                  <div key={`attr-${key}`}>
                    <button
                      type="button"
                      className="w-full text-left px-2 py-1 rounded border border-white/10 bg-black/20 hover:bg-black/30"
                      onClick={() => setOpenAttrKey((cur) => (cur === key ? null : key))}
                    >
                      <span className="font-medium">{key}</span>
                      <span className="ml-2 text-xs text-white/60">
                        {(selectedAttrFacets[key] || []).length > 0
                          ? `(${(selectedAttrFacets[key] || []).length} selected)`
                          : ''}
                      </span>
                    </button>
                    {openAttrKey === key && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {values.map((v) => {
                          const active = (selectedAttrFacets[key] || []).includes(v);
                          return (
                            <button
                              key={`attr-${key}-${v}`}
                              type="button"
                              onClick={() => toggleAttrFacetValue(key, v)}
                              className={
                                'text-xs px-2 py-1 rounded-full border transition ' +
                                (active
                                  ? 'bg-primary/20 border-primary text-primary'
                                  : 'bg-black/30 border-white/15 text-white')
                              }
                            >
                              {v}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </details>

          {/* Dropdown: Specifications */}
          <details className="bg-black/30 border border-white/10 rounded-2xl p-4 space-y-3">
            <summary className="flex items-center justify-between cursor-pointer list-none">
              <span className="font-ethno text-base">Filter By Specifications</span>
              <button
                type="button"
                className="text-xs text-white/70 hover:text-white"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedSpecFacets({});
                  setOpenSpecKey(null);
                }}
              >
                Clear
              </button>
            </summary>
            {Object.keys(specFacets).length === 0 ? (
              <p className="text-sm text-white/60">No specifications available.</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(specFacets).map(([key, values]) => (
                  <div key={`spec-${key}`}>
                    <button
                      type="button"
                      className="w-full text-left px-2 py-1 rounded border border-white/10 bg-black/20 hover:bg-black/30"
                      onClick={() => setOpenSpecKey((cur) => (cur === key ? null : key))}
                    >
                      <span className="font-medium">{key}</span>
                      <span className="ml-2 text-xs text-white/60">
                        {(selectedSpecFacets[key] || []).length > 0
                          ? `(${(selectedSpecFacets[key] || []).length} selected)`
                          : ''}
                      </span>
                    </button>
                    {openSpecKey === key && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {values.map((v) => {
                          const active = (selectedSpecFacets[key] || []).includes(v);
                          return (
                            <button
                              key={`spec-${key}-${v}`}
                              type="button"
                              onClick={() => toggleSpecFacetValue(key, v)}
                              className={
                                'text-xs px-2 py-1 rounded-full border transition ' +
                                (active
                                  ? 'bg-primary/20 border-primary text-primary'
                                  : 'bg-black/30 border-white/15 text-white')
                              }
                            >
                              {v}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </details>
          <div className="flex items-center justify-between">
            <h3 className="font-ethno text-lg">Products</h3>
            <div className="text-sm text-white/60">
              {filteredProducts.length} result{filteredProducts.length === 1 ? '' : 's'}
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <p className="text-white/70">No products match the selected filters.</p>
          ) : (
            <ul className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map((p) => (
                <li key={(p as any)._id} className="border border-white/10 rounded bg-black/30 p-3">
                  <div className="text-[11px] text-white/80 line-clamp-2 mb-1">
                    {(p as any).title}
                  </div>
                  <div className="text-accent font-bold text-sm mb-2">
                    {typeof (p as any).price === 'number' ? `$${(p as any).price.toFixed(2)}` : '—'}
                  </div>
                  <button className="btn-glass btn-compact" onClick={() => addToBuild(p)}>
                    Add
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Quote Form (bottom of page) */}
      <section className="bg-black/30 border border-white/10 rounded-2xl p-4">
        <form onSubmit={submitQuote} className="grid gap-3 md:grid-cols-2">
          <input
            name="name"
            placeholder="Your Name"
            required
            className="bg-black/30 border border-white/10 rounded px-2 py-2 md:col-span-1"
          />
          <input
            name="email"
            type="email"
            placeholder="Email"
            required
            className="bg-black/30 border border-white/10 rounded px-2 py-2 md:col-span-1"
          />
          <input
            name="phone"
            placeholder="Phone"
            className="bg-black/30 border border-white/10 rounded px-2 py-2 md:col-span-2"
          />
          <textarea
            name="notes"
            placeholder="Notes / goals"
            rows={3}
            className="bg-black/30 border border-white/10 rounded px-2 py-2 md:col-span-2"
          />
          <button
            type="submit"
            disabled={submitting}
            className="btn-glass btn-compact md:col-span-2"
          >
            {submitting ? 'Sending…' : 'Send Build for Quote'}
          </button>
        </form>
      </section>
    </>
  );
}

// Vehicle presets + token mapping used to match product.filters when compatibleVehicles isn't present
const VEHICLES: Array<{ id: string; label: string; image: string; tokens: string[] }> = [
  {
    id: 'trackhawk',
    label: 'Jeep Trackhawk',
    image: '/images/jeep trackhawk 900 package.png',
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
    image: '/images/challenger FAS.png',
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
