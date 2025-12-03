import React, { useEffect, useMemo, useState } from 'react';

type InventoryItem = {
  _id: string;
  product?: { _id?: string; title?: string; sku?: string; image?: string };
  vendorSku?: string;
  cost?: number;
  quantityAvailable?: number;
  leadTime?: number;
  minimumOrder?: number;
  lastUpdated?: string;
  active?: boolean;
};

const InventoryPage: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [dirty, setDirty] = useState<Record<string, Partial<InventoryItem>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/vendor/inventory', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to load inventory');
      setItems(data.items || []);
      setDirty({});
    } catch (err: any) {
      setError(err?.message || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => {
      const haystack = [
        item.product?.title,
        item.product?.sku,
        item.vendorSku,
        item.product?._id
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [items, filter]);

  const markDirty = (id: string, patch: Partial<InventoryItem>) => {
    setDirty((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }));
  };

  const handleSave = async () => {
    const payload = Object.entries(dirty).map(([id, values]) => ({
      _id: id,
      quantityAvailable:
        typeof values.quantityAvailable === 'number'
          ? values.quantityAvailable
          : undefined,
      leadTime: typeof values.leadTime === 'number' ? values.leadTime : undefined
    }));
    if (!payload.length) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/vendor/inventory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ items: payload })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to save inventory');
      await load();
    } catch (err: any) {
      setError(err?.message || 'Failed to save inventory');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-white/80">Loading inventory...</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Inventory</h1>
          <p className="text-white/60 text-sm">Update quantity and lead time inline.</p>
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
              <th className="px-4 py-3 text-right">Quantity</th>
              <th className="px-4 py-3 text-right">Lead Time (days)</th>
              <th className="px-4 py-3 text-right">Cost</th>
              <th className="px-4 py-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => {
              const dirtyItem = dirty[item._id] || {};
              const qty =
                dirtyItem.quantityAvailable ??
                (typeof item.quantityAvailable === 'number' ? item.quantityAvailable : 0);
              const lead =
                dirtyItem.leadTime ?? (typeof item.leadTime === 'number' ? item.leadTime : 0);
              const lowStock = qty <= (item.minimumOrder || 0);
              return (
                <tr key={item._id} className="border-t border-white/5">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {item.product?.image && (
                        <img
                          src={item.product.image}
                          alt={item.product.title || ''}
                          className="w-10 h-10 rounded object-cover"
                          loading="lazy"
                        />
                      )}
                      <div>
                        <div className="font-semibold">{item.product?.title || '—'}</div>
                        <div className="text-white/60 text-xs">{item.product?.sku || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{item.vendorSku || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <input
                      type="number"
                      value={qty}
                      onChange={(e) =>
                        markDirty(item._id, { quantityAvailable: Number(e.target.value) })
                      }
                      className="w-24 bg-zinc-900 border border-white/20 text-right rounded px-2 py-1"
                    />
                    {lowStock && <div className="text-xs text-yellow-300 mt-1">Low stock</div>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <input
                      type="number"
                      value={lead}
                      onChange={(e) => markDirty(item._id, { leadTime: Number(e.target.value) })}
                      className="w-24 bg-zinc-900 border border-white/20 text-right rounded px-2 py-1"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">${(item.cost || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        item.active ? 'bg-green-500/20 text-green-200' : 'bg-white/10 text-white/70'
                      }`}
                    >
                      {item.active ? 'Active' : 'Inactive'}
                    </span>
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

export default InventoryPage;
