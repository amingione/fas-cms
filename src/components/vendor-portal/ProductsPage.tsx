import React, { useEffect, useMemo, useState } from 'react';

type Product = {
  _id: string;
  product?: { _id?: string; title?: string; sku?: string; price?: number; status?: string; image?: string };
  vendorSku?: string;
  cost?: number;
  active?: boolean;
  lastUpdated?: string;
};

const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [dirty, setDirty] = useState<Record<string, Partial<Product>>>({});
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/vendor/products', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to load products');
      setProducts(data.products || []);
      setDirty({});
    } catch (err: any) {
      setError(err?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (!term) return products;
    return products.filter((p) => {
      const hay = [
        p.product?.title,
        p.product?.sku,
        p.vendorSku,
        p.product?._id
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(term);
    });
  }, [products, filter]);

  const markDirty = (id: string, patch: Partial<Product>) => {
    setDirty((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }));
  };

  const handleSave = async () => {
    const payload = Object.entries(dirty).map(([id, values]) => ({
      _id: id,
      cost: typeof values.cost === 'number' ? values.cost : undefined,
      active: typeof values.active === 'boolean' ? values.active : undefined
    }));
    if (!payload.length) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/vendor/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ items: payload })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to save products');
      await load();
    } catch (err: any) {
      setError(err?.message || 'Failed to save products');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-white/80">Loading products...</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Products</h1>
          <p className="text-white/60 text-sm">Manage catalog pricing and availability.</p>
        </div>
        <div className="flex gap-3">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search products"
            className="bg-zinc-900 border border-white/20 text-white rounded px-3 py-2 text-sm"
          />
          <button
            disabled={saving || !Object.keys(dirty).length}
            onClick={handleSave}
            className="bg-primary text-white rounded px-4 py-2 text-sm disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <div className="overflow-auto rounded-lg border border-white/10">
        <table className="min-w-full text-sm text-white">
          <thead className="bg-white/5 text-left">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Vendor SKU</th>
              <th className="px-4 py-3 text-right">Cost</th>
              <th className="px-4 py-3 text-right">Retail</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const dirtyItem = dirty[p._id] || {};
              const cost =
                dirtyItem.cost ?? (typeof p.cost === 'number' ? p.cost : 0);
              const active =
                typeof dirtyItem.active === 'boolean' ? dirtyItem.active : p.active;
              return (
                <tr key={p._id} className="border-t border-white/5">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.product?.image && (
                        <img
                          src={p.product.image}
                          alt={p.product.title || ''}
                          className="w-10 h-10 rounded object-cover"
                          loading="lazy"
                        />
                      )}
                      <div>
                        <div className="font-semibold">{p.product?.title || '—'}</div>
                        <div className="text-white/60 text-xs">{p.product?.sku || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{p.vendorSku || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <input
                      type="number"
                      value={cost}
                      onChange={(e) => markDirty(p._id, { cost: Number(e.target.value) })}
                      className="w-24 bg-zinc-900 border border-white/20 text-right rounded px-2 py-1"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    ${(p.product?.price || 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={Boolean(active)}
                        onChange={(e) => markDirty(p._id, { active: e.target.checked })}
                        className="h-4 w-4"
                      />
                      <span>{active ? 'Active' : 'Inactive'}</span>
                    </label>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductsPage;
