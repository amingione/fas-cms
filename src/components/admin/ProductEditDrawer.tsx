import React, { useEffect, useRef, useState } from 'react';
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
  refresh: () => void | Promise<void>;
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
    const res = await fetch(`${window.location.origin}/.netlify/functions/upload-image`, {
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

      const payload: any = {
        _id: form._id || undefined,
        title: (form.title || '').trim(),
        sku: form.sku || undefined,
        price: Number(form.price) || 0,
        featured: !!form.featured,
        categoryIds: form.categoryIds || [],
        imageAssetId: imageAssetId || undefined
      };

      const res = await fetch(`${window.location.origin}/.netlify/functions/products-upsert`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });

      setSaving(false);
      if (!res.ok) {
        const msg = await res.text();
        return push(msg || 'Save failed');
      }

      push('Saved');
      onClose();
      await Promise.resolve(refresh());
    } catch (e: any) {
      setSaving(false);
      push(e?.message || 'Save failed');
    }
  }

  function toggleCat(id: string) {
    setForm((f) => {
      const set = new Set(f.categoryIds || []);
      set.has(id) ? set.delete(id) : set.add(id);
      return { ...f, categoryIds: Array.from(set) };
    });
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[1000]" aria-modal="true" role="dialog">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60" onClick={onClose} />

          {/* Panel */}
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-[#0b0b0b] shadow-xl border-l border-white/10 overflow-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#0b0b0b]/95 backdrop-blur">
              <div className="text-base font-medium">
                {form._id ? 'Edit Product' : 'New Product'}
              </div>
              <button
                onClick={onClose}
                className="px-2 py-1 rounded border border-white/20 hover:bg-white/10 transition"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="p-4 grid gap-4">
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
          </div>
        </div>
      )}
    </>
  );
}
