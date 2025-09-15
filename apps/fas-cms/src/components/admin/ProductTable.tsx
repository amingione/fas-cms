import React, { useMemo, useState, useEffect } from 'react';
import ProductEditDrawer from './ProductEditDrawer';

type Row = {
  _id: string;
  title: string;
  sku?: string;
  price: number;
  featured?: boolean;
  imageUrl?: string;
  categoryNames?: string[];
  draft?: boolean;
};

export default function ProductTable({
  rows,
  refresh
}: {
  rows: Row[];
  refresh: () => Row[] | Promise<Row[]> | void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [data, setData] = useState<Row[]>(Array.isArray(rows) ? rows : []);
  const [search, setSearch] = useState('');
  const [cats, setCats] = useState<{ _id: string; title: string }[]>([]);
  const [catFilter, setCatFilter] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [assignCatId, setAssignCatId] = useState<string>('');
  const [pubFilter, setPubFilter] = useState<'all' | 'published' | 'draft'>('all');

  useEffect(() => {
    const openNew = () => {
      setSelected({ title: '', price: 0, sku: '', featured: false, categoryIds: [] });
      setOpen(true);
      try {
        console.info('[ProductTable] opening new product drawer');
      } catch {}
    };

    // Try to bind directly if the button is already in the DOM
    const btn = document.getElementById('newProductBtn');
    if (btn) btn.addEventListener('click', openNew);

    // Also bind a document-level click listener to catch late-mounting buttons
    const delegate = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      // Direct match or inside the button
      const el = t.id === 'newProductBtn' ? t : t.closest?.('#newProductBtn');
      if (el) openNew();
    };
    document.addEventListener('click', delegate, true);

    return () => {
      if (btn) btn.removeEventListener('click', openNew);
      document.removeEventListener('click', delegate, true);
    };
  }, []);

  // Sync external rows
  useEffect(() => {
    if (Array.isArray(rows) && rows.length) setData(rows);
  }, [rows]);

  // Auto-load on mount if no initial data
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!Array.isArray(rows) || rows.length === 0) {
          const res = await Promise.resolve(refresh() as any);
          if (mounted && Array.isArray(res)) setData(res);
        }
      } catch {}
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const sorted = useMemo(() => data.slice().sort((a, b) => a.title.localeCompare(b.title)), [data]);
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return sorted.filter((r) => {
      const hit =
        !q ||
        r.title.toLowerCase().includes(q) ||
        (r.sku || '').toLowerCase().includes(q) ||
        (r.categoryNames || []).some((c) => (c || '').toLowerCase().includes(q));
      const catOk = !catFilter || (r.categoryNames || []).includes(catFilter);
      const pubOk =
        pubFilter === 'all' ? true : pubFilter === 'draft' ? !!r.draft : !r.draft;
      return hit && catOk && pubOk;
    });
  }, [sorted, search, catFilter]);

  function toggleAll(checked: boolean) {
    if (checked) setSelectedIds(new Set(filtered.map((r) => r._id)));
    else setSelectedIds(new Set());
  }
  function toggleOne(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  }

  async function bulkFeature(val: boolean) {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      try {
        await fetch('/.netlify/functions/products-upsert', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ _id: id, featured: val })
        });
      } catch {}
    }
    await Promise.resolve(refresh() as any);
    setSelectedIds(new Set());
  }

  async function bulkDelete() {
    if (!selectedIds.size) return;
    if (!confirm(`Delete ${selectedIds.size} product(s)?`)) return;
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      try {
        await fetch('/.netlify/functions/products-delete', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ _id: id })
        });
      } catch {}
    }
    await Promise.resolve(refresh() as any);
    setSelectedIds(new Set());
  }

  // Load categories for filter
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/.netlify/functions/categories-list');
        if (!r.ok) return;
        const list = await r.json();
        const mapped = Array.isArray(list) ? list.map((c: any) => ({ _id: c._id, title: c.title })) : [];
        setCats(mapped);
      } catch {}
    })();
  }, []);

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="text-base font-medium">Products</div>
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, SKU, category"
            className="bg-transparent border border-white/30 rounded px-3 py-1.5 text-sm"
          />
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="bg-transparent border border-white/30 rounded px-2 py-1.5 text-sm"
          >
            <option value="">All Categories</option>
            {cats.map((c) => (
              <option key={c._id} value={c.title}>
                {c.title}
              </option>
            ))}
          </select>
          <select
            value={pubFilter}
            onChange={(e) => setPubFilter(e.target.value as any)}
            className="bg-transparent border border-white/30 rounded px-2 py-1.5 text-sm"
          >
            <option value="all">All</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <button className="btn-glass btn-sm btn-primary" onClick={() => bulkFeature(true)}>
              Mark Featured ({selectedIds.size})
            </button>
            <button className="btn-glass btn-sm btn-outline" onClick={() => bulkFeature(false)}>
              Clear Featured
            </button>
            <button className="btn-glass btn-sm btn-dark" onClick={bulkDelete}>
              Delete Selected
            </button>
            <select
              value={assignCatId}
              onChange={(e) => setAssignCatId(e.target.value)}
              className="bg-transparent border border-white/30 rounded px-2 py-1.5 text-sm"
            >
              <option value="">Assign Category…</option>
              {cats.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.title}
                </option>
              ))}
            </select>
            <button
              className="btn-glass btn-sm btn-secondary"
              disabled={!assignCatId}
              onClick={async () => {
                if (!assignCatId) return;
                const ids = Array.from(selectedIds);
                for (const id of ids) {
                  try {
                    await fetch('/.netlify/functions/products-upsert', {
                      method: 'POST',
                      headers: { 'content-type': 'application/json' },
                      body: JSON.stringify({ _id: id, categoryIds: [assignCatId] })
                    });
                  } catch {}
                }
                await Promise.resolve(refresh() as any);
                setSelectedIds(new Set());
                setAssignCatId('');
              }}
            >
              Assign
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            setSelected({ title: '', price: 0, sku: '', featured: false, categoryIds: [] });
            setOpen(true);
          }}
          className="btn-glass btn-primary"
        >
          New Product
        </button>
      </div>
      <div className="overflow-x-auto border border-white/20 rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-white/5">
            <tr className="[&>th]:text-left [&>th]:px-3 [&>th]:py-2">
              <th className="w-8">
                <input
                  type="checkbox"
                  checked={selectedIds.size > 0 && selectedIds.size === filtered.length}
                  onChange={(e) => toggleAll(e.currentTarget.checked)}
                />
              </th>
              <th>Product</th>
              <th>SKU</th>
              <th>Price</th>
              <th>Featured</th>
              <th>Categories</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr
                key={r._id}
                className="border-t border-white/20 [&>td]:px-3 [&>td]:py-2 hover:bg-white/5 transition"
              >
                <td>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(r._id)}
                    onChange={(e) => toggleOne(r._id, e.currentTarget.checked)}
                  />
                </td>
                <td className="flex items-center gap-2">
                  {r.imageUrl ? (
                    <img
                      src={r.imageUrl + '?h=40&w=40&fit=crop'}
                      className="w-10 h-10 rounded object-cover"
                      loading="lazy"
                    />
                  ) : null}
                  <span className="font-medium">{r.title}</span>
                </td>
                <td>{r.sku || '—'}</td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    defaultValue={r.price?.toFixed(2)}
                    className="w-24 bg-transparent border border-white/20 rounded px-2 py-1"
                    onBlur={async (e) => {
                      const val = Number(e.currentTarget.value);
                      if (!Number.isFinite(val)) return;
                      await fetch('/.netlify/functions/products-upsert', {
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({ _id: r._id, price: val })
                      });
                    }}
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    defaultChecked={!!r.featured}
                    onChange={async (e) => {
                      await fetch('/.netlify/functions/products-upsert', {
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({ _id: r._id, featured: e.currentTarget.checked })
                      });
                    }}
                  />
                </td>
                <td className="text-white/80">
                  {r.categoryNames?.join(', ') || '—'}
                  {r.draft ? (
                    <span className="ml-2 inline-block text-[10px] px-1.5 py-0.5 rounded-full border border-white/30">Draft</span>
                  ) : null}
                </td>
                <td className="text-right space-x-2">
                  <button
                    onClick={() => {
                      setSelected({
                        _id: r._id,
                        title: r.title,
                        sku: r.sku,
                        price: r.price,
                        featured: r.featured,
                        imageUrl: r.imageUrl,
                        categoryIds: [] // loaded in drawer
                      });
                      setOpen(true);
                    }}
                    className="btn-glass btn-sm btn-primary"
                  >
                    Edit
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm('Duplicate this product?')) return;
                      try {
                        const res = await fetch('/.netlify/functions/products-duplicate', {
                          method: 'POST',
                          headers: { 'content-type': 'application/json' },
                          body: JSON.stringify({ _id: r._id })
                        });
                        if (!res.ok) throw new Error(await res.text());
                        await Promise.resolve(refresh() as any);
                      } catch (e) {
                        console.error('Duplicate failed', e);
                        alert('Duplicate failed');
                      }
                    }}
                    className="btn-glass btn-sm btn-outline"
                  >
                    Duplicate
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ProductEditDrawer
        open={open}
        onClose={() => setOpen(false)}
        product={selected || undefined}
        refresh={async () => {
          const res = await Promise.resolve(refresh() as any);
          if (Array.isArray(res)) setData(res);
          setOpen(false);
        }}
      />
    </>
  );
}
