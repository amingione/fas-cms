import React, { useEffect, useRef, useState } from 'react';
import Drawer from './Drawer';
import { useToast } from './Toast';

type Product = {
  _id?: string;
  title: string;
  sku?: string;
  price: number;
  featured?: boolean;
  imageUrl?: string;
  imageAssetId?: string;
  categoryIds?: string[];
};
type Category = { _id: string; title: string };

export default function ProductEditDrawer({
  open,
  onClose,
  product,
  refresh
}: {
  open: boolean;
  onClose: () => void;
  product?: Product;
  refresh: () => void;
}) {
  const { push } = useToast();
  const [saving, setSaving] = useState(false);
  const [cats, setCats] = useState<Category[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<Product>(
    product || { title: '', price: 0, sku: '', featured: false, categoryIds: [] }
  );

  useEffect(() => {
    setForm(product || { title: '', price: 0, sku: '', featured: false, categoryIds: [] });
  }, [product, open]);
  useEffect(() => {
    fetch('/.netlify/functions/categories-list')
      .then((r) => r.json())
      .then(setCats)
      .catch(() => setCats([]));
  }, []);

  async function upload(file: File) {
    const res = await fetch('/.netlify/functions/upload-image', {
      method: 'POST',
      headers: { 'content-type': file.type },
      body: await file.arrayBuffer()
    } as any);
    if (!res.ok) throw new Error(await res.text());
    return (await res.json()).assetId as string;
  }

  async function save() {
    try {
      setSaving(true);
      let imageAssetId = form.imageAssetId;
      const file = fileRef.current?.files?.[0];
      if (file) imageAssetId = await upload(file);

      const res = await fetch('/.netlify/functions/products-upsert', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          _id: form._id,
          title: form.title,
          sku: form.sku,
          price: Number(form.price),
          featured: !!form.featured,
          categoryIds: form.categoryIds || [],
          imageAssetId
        })
      });
      setSaving(false);
      if (!res.ok) return push(await res.text());
      push('Saved');
      onClose();
      refresh();
    } catch (e: any) {
      setSaving(false);
      push(e.message || 'Save failed');
    }
  }

  function toggleCat(id: string) {
    setForm((f) => {
      const set = new Set(f.categoryIds || []);
      set.has(id) ? set.delete(id) : set.add(id);
      return { ...f, categoryIds: Array.from(set) };
    });
  }

  return (
    <Drawer open={open} onClose={onClose} title={form._id ? 'Edit Product' : 'New Product'}>
      <div className="grid gap-4">
        <label className="grid gap-1">
          <span className="text-sm text-white/70">Title</span>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="bg-transparent border border-white/20 rounded px-3 py-2"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1">
            <span className="text-sm text-white/70">SKU</span>
            <input
              value={form.sku || ''}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              className="bg-transparent border border-white/20 rounded px-3 py-2"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-white/70">Price</span>
            <input
              type="number"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
              className="bg-transparent border border-white/20 rounded px-3 py-2"
            />
          </label>
        </div>

        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!form.featured}
            onChange={(e) => setForm({ ...form, featured: e.target.checked })}
            className="accent-white/80"
          />
          <span>Featured</span>
        </label>

        <div>
          <div className="text-sm text-white/70 mb-1">Categories</div>
          <div className="flex flex-wrap gap-2">
            {cats.map((c) => (
              <button
                key={c._id}
                onClick={() => toggleCat(c._id)}
                className={`px-3 py-1 rounded-full border transition ${form.categoryIds?.includes(c._id) ? 'bg-white text-black border-white' : 'border-white/20 hover:border-white/50'}`}
              >
                {c.title}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-1">
          <span className="text-sm text-white/70">Image</span>
          <input type="file" ref={fileRef} accept="image/*" className="text-sm" />
        </div>

        <div className="pt-2 flex gap-2">
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 rounded bg-white text-black hover:bg-white/90 transition"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={onClose}
            className="px-3 py-2 rounded border border-white/20 hover:bg-white/5 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </Drawer>
  );
}
