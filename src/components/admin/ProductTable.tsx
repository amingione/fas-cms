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
};

export default function ProductTable({
  rows,
  refresh
}: {
  rows: Row[];
  refresh: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);

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

  const sorted = useMemo(() => rows.slice().sort((a, b) => a.title.localeCompare(b.title)), [rows]);

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <div className="text-base font-medium">Products</div>
        <button
          type="button"
          onClick={() => {
            setSelected({ title: '', price: 0, sku: '', featured: false, categoryIds: [] });
            setOpen(true);
          }}
          className="px-3 py-1.5 rounded bg-white text-black hover:bg-white/90 transition border border-white/0"
        >
          New Product
        </button>
      </div>
      <div className="overflow-x-auto border border-white/10 rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-white/5">
            <tr className="[&>th]:text-left [&>th]:px-3 [&>th]:py-2">
              <th>Product</th>
              <th>SKU</th>
              <th>Price</th>
              <th>Featured</th>
              <th>Categories</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr
                key={r._id}
                className="border-t border-white/10 [&>td]:px-3 [&>td]:py-2 hover:bg-white/5 transition"
              >
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
                <td>${r.price?.toFixed(2)}</td>
                <td>{r.featured ? 'Yes' : 'No'}</td>
                <td className="text-white/80">{r.categoryNames?.join(', ') || '—'}</td>
                <td className="text-right">
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
                    className="px-3 py-1 rounded border border-white/20 hover:bg-white/10 transition"
                  >
                    Edit
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
          await Promise.resolve(refresh());
          setOpen(false);
        }}
      />
    </>
  );
}
