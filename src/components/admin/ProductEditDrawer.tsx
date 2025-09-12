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
  description?: string;
  shortDescription?: string;
  specifications?: { key?: string; value?: string }[];
  addOns?: { label?: string; priceDelta?: number }[];
  // SEO
  slug?: string;
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  noindex?: boolean;
  draft?: boolean;
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
    product || {
      title: '',
      price: 0,
      sku: '',
      featured: false,
      categoryIds: [],
      description: '',
      shortDescription: '',
      specifications: [],
      addOns: [],
      slug: '',
      metaTitle: '',
      metaDescription: '',
      canonicalUrl: '',
      noindex: false,
      draft: false
    }
  );

  useEffect(() => {
    setForm(
      product || {
        title: '',
        price: 0,
        sku: '',
        featured: false,
        categoryIds: [],
        description: '',
        shortDescription: '',
        specifications: [],
        addOns: [],
        slug: '',
        metaTitle: '',
        metaDescription: '',
        canonicalUrl: '',
        noindex: false,
        draft: false
      }
    );
  }, [product, open]);
  useEffect(() => {
    fetch('/.netlify/functions/categories-list')
      .then((r) => r.json())
      .then(setCats)
      .catch(() => setCats([]));
  }, []);

  // When editing an existing product, load its categoryIds and image if needed
  useEffect(() => {
    (async () => {
      try {
        if (!open) return;
        const id = product?._id;
        if (!id) return;
        const res = await fetch(`/.netlify/functions/products-detail?id=${encodeURIComponent(id)}`);
        if (!res.ok) return;
        const detail = await res.json();
        setForm((prev) => ({
          ...prev,
          categoryIds: Array.isArray(detail?.categoryIds) ? detail.categoryIds : [],
          imageAssetId: detail?.imageAssetId || prev.imageAssetId,
          draft: typeof detail?.draft === 'boolean' ? detail.draft : prev.draft
        }));
      } catch {}
    })();
  }, [open, product?._id]);

  // Slug validation helpers
  function toSlug(s: string) {
    return s
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }

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
        imageAssetId: imageAssetId || undefined,
        description: form.description,
        shortDescription: form.shortDescription,
        specifications: Array.isArray(form.specifications)
          ? form.specifications.filter((x) => (x?.key || x?.value)?.toString().trim())
          : undefined,
        addOns: Array.isArray(form.addOns)
          ? form.addOns.filter((x) => (x?.label || '').toString().trim())
          : undefined,
        slug: form.slug,
        metaTitle: form.metaTitle,
        metaDescription: form.metaDescription,
        canonicalUrl: form.canonicalUrl,
        noindex: !!form.noindex,
        draft: !!form.draft
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
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-[#0b0b0b] shadow-xl border-l border-white/20 overflow-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-white/20 bg-[#0b0b0b]/95 backdrop-blur">
              <div className="text-base font-medium">
                {form._id ? 'Edit Product' : 'New Product'}
              </div>
              <div className="space-x-2">
                {form._id ? (
                  <>
                    <button
                      onClick={async () => {
                        if (!form._id) return;
                        if (!confirm('Delete this product? This cannot be undone.')) return;
                        try {
                          const res = await fetch('/.netlify/functions/products-delete', {
                            method: 'POST',
                            headers: { 'content-type': 'application/json' },
                            body: JSON.stringify({ _id: form._id })
                          });
                          if (!res.ok) throw new Error(await res.text());
                          push('Deleted');
                          onClose();
                          await Promise.resolve(refresh());
                        } catch (e: any) {
                          push(e?.message || 'Delete failed');
                        }
                      }}
                      className="btn-glass btn-sm btn-outline"
                    >
                      Delete
                    </button>
                    <button
                      onClick={async () => {
                        if (!form._id) return;
                        try {
                          const res = await fetch('/.netlify/functions/products-duplicate', {
                            method: 'POST',
                            headers: { 'content-type': 'application/json' },
                            body: JSON.stringify({ _id: form._id })
                          });
                          if (!res.ok) throw new Error(await res.text());
                          push('Duplicated');
                          await Promise.resolve(refresh());
                        } catch (e: any) {
                          push(e?.message || 'Duplicate failed');
                        }
                      }}
                      className="btn-glass btn-sm btn-secondary"
                    >
                      Duplicate
                    </button>
                  </>
                ) : null}
                <button
                  onClick={onClose}
                  className="btn-glass btn-sm btn-dark"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-4 grid gap-4">
              <label className="grid gap-1">
                <span className="text-sm text-white/70">Title</span>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="bg-transparent border border-white/30 rounded px-3 py-2"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1">
                  <span className="text-sm text-white/70">SKU</span>
                  <input
                    value={form.sku || ''}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    className="bg-transparent border border-white/30 rounded px-3 py-2"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-sm text-white/70">Price</span>
                  <input
                    type="number"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                    className="bg-transparent border border-white/30 rounded px-3 py-2"
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
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!form.draft}
                  onChange={(e) => setForm({ ...form, draft: e.target.checked })}
                  className="accent-white/80"
                />
                <span>Draft</span>
              </label>

              {/* Descriptions */}
              <label className="grid gap-1">
                <span className="text-sm text-white/70">Short Description</span>
                <textarea
                  value={form.shortDescription || ''}
                  onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
                  rows={2}
                  className="bg-transparent border border-white/30 rounded px-3 py-2"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-sm text-white/70">Description</span>
                <textarea
                  value={form.description || ''}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={4}
                  className="bg-transparent border border-white/30 rounded px-3 py-2"
                />
              </label>

              <div>
                <div className="text-sm text-white/70 mb-1">Categories</div>
                <div className="flex flex-wrap gap-2">
                  {cats.map((c) => (
                    <button
                      key={c._id}
                      onClick={() => toggleCat(c._id)}
                      className={`px-3 py-1 rounded-full border transition ${form.categoryIds?.includes(c._id) ? 'bg-white text-accent border-white' : 'border-white/30 hover:border-white/30'}`}
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

              {/* Specifications (key/value) */}
              <div className="grid gap-2">
                <div className="text-sm text-white/70">Specifications</div>
                <div className="space-y-2">
                  {(form.specifications || []).map((sp, idx) => (
                    <div key={idx} className="grid grid-cols-2 gap-2">
                      <input
                        placeholder="Key"
                        value={sp?.key || ''}
                        onChange={(e) => {
                          const arr = [...(form.specifications || [])];
                          arr[idx] = { ...arr[idx], key: e.target.value };
                          setForm({ ...form, specifications: arr });
                        }}
                        className="bg-transparent border border-white/30 rounded px-3 py-2"
                      />
                      <input
                        placeholder="Value"
                        value={sp?.value || ''}
                        onChange={(e) => {
                          const arr = [...(form.specifications || [])];
                          arr[idx] = { ...arr[idx], value: e.target.value };
                          setForm({ ...form, specifications: arr });
                        }}
                        className="bg-transparent border border-white/30 rounded px-3 py-2"
                      />
                    </div>
                  ))}
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, specifications: [...(form.specifications || []), { key: '', value: '' }] })}
                    className="px-3 py-1.5 rounded border border-white/30 hover:bg-white/5"
                  >
                    Add Spec
                  </button>
                </div>
              </div>

              {/* Add-ons */}
              <div className="grid gap-2">
                <div className="text-sm text-white/70">Add-Ons</div>
                <div className="space-y-2">
                  {(form.addOns || []).map((ad, idx) => (
                    <div key={idx} className="grid grid-cols-2 gap-2">
                      <input
                        placeholder="Label"
                        value={ad?.label || ''}
                        onChange={(e) => {
                          const arr = [...(form.addOns || [])];
                          arr[idx] = { ...arr[idx], label: e.target.value };
                          setForm({ ...form, addOns: arr });
                        }}
                        className="bg-transparent border border-white/30 rounded px-3 py-2"
                      />
                      <input
                        placeholder="Price Delta"
                        type="number"
                        step="0.01"
                        value={ad?.priceDelta ?? 0}
                        onChange={(e) => {
                          const arr = [...(form.addOns || [])];
                          arr[idx] = { ...arr[idx], priceDelta: Number(e.target.value) };
                          setForm({ ...form, addOns: arr });
                        }}
                        className="bg-transparent border border-white/30 rounded px-3 py-2"
                      />
                    </div>
                  ))}
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, addOns: [...(form.addOns || []), { label: '', priceDelta: 0 }] })}
                    className="px-3 py-1.5 rounded border border-white/30 hover:bg-white/5"
                  >
                    Add Add-on
                  </button>
                </div>
              </div>

              {/* SEO / Meta */}
              <div className="grid gap-3 border-t border-white/10 pt-3">
                <div className="text-sm text-white/80 font-medium">SEO</div>
                <label className="grid gap-1">
                  <span className="text-sm text-white/70">Slug</span>
                  <input
                    value={form.slug || ''}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    onBlur={() => setForm((f) => ({ ...f, slug: toSlug(f.slug || f.title || '') }))}
                    placeholder="auto-from-title if empty"
                    className="bg-transparent border border-white/30 rounded px-3 py-2"
                  />
                  <div className="text-xs text-white/60">Preview: /shop/{toSlug(form.slug || form.title || '')}</div>
                </label>
                <label className="grid gap-1">
                  <span className="text-sm text-white/70">Meta Title</span>
                  <input
                    value={form.metaTitle || ''}
                    onChange={(e) => setForm({ ...form, metaTitle: e.target.value })}
                    className="bg-transparent border border-white/30 rounded px-3 py-2"
                  />
                  <div className="text-xs text-white/60">{(form.metaTitle || '').length} / 60</div>
                </label>
                <label className="grid gap-1">
                  <span className="text-sm text-white/70">Meta Description</span>
                  <textarea
                    value={form.metaDescription || ''}
                    onChange={(e) => setForm({ ...form, metaDescription: e.target.value })}
                    rows={2}
                    className="bg-transparent border border-white/30 rounded px-3 py-2"
                  />
                  <div className="text-xs text-white/60">{(form.metaDescription || '').length} / 160</div>
                </label>
              <label className="grid gap-1">
                <span className="text-sm text-white/70">Canonical URL</span>
                <input
                  value={form.canonicalUrl || ''}
                  onChange={(e) => setForm({ ...form, canonicalUrl: e.target.value })}
                  className="bg-transparent border border-white/30 rounded px-3 py-2"
                />
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!form.noindex}
                  onChange={(e) => setForm({ ...form, noindex: e.target.checked })}
                  className="accent-white/80"
                />
                <span>Noindex</span>
              </label>

              {/* SERP Preview */}
              <div className="mt-2 rounded-lg border border-white/15 bg-black/50 p-3">
                <div className="text-xs text-white/60 mb-1">Search Preview</div>
                <div className="text-sm text-blue-400 truncate">
                  {(form.metaTitle || form.title || 'Product Title')}
                </div>
                <div className="text-xs text-green-500 truncate">
                  {(() => {
                    try {
                      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://example.com';
                      return `${origin}/shop/${toSlug(form.slug || form.title || '')}`;
                    } catch {
                      return `/shop/${toSlug(form.slug || form.title || '')}`;
                    }
                  })()}
                </div>
                <div className="text-[13px] text-white/80 mt-1 line-clamp-2">
                  {form.metaDescription || form.shortDescription || 'Meta description preview goes here.'}
                </div>
              </div>
            </div>

              <div className="pt-2 flex gap-2">
                <button
                  onClick={save}
                  disabled={saving}
                  className="btn-glass btn-primary"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={onClose}
                  className="btn-glass btn-outline"
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
