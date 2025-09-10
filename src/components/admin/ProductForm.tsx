import React, { useRef, useState } from 'react';

export default function ProductForm({ onSaved }: { onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function uploadImage(file: File) {
    const res = await fetch('/.netlify/functions/upload-image', {
      method: 'POST',
      headers: { 'content-type': file.type },
      body: await file.arrayBuffer() // Netlify encodes to base64 for us
    } as any);
    if (!res.ok) throw new Error(await res.text());
    const { assetId } = await res.json();
    return assetId;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const f = e.currentTarget;
    const title = (f.elements.namedItem('title') as HTMLInputElement).value;
    const sku = (f.elements.namedItem('sku') as HTMLInputElement).value;
    const price = Number((f.elements.namedItem('price') as HTMLInputElement).value);
    const featured = (f.elements.namedItem('featured') as HTMLInputElement).checked;

    let imageAssetId: string | undefined;
    const file = fileRef.current?.files?.[0];
    if (file) imageAssetId = await uploadImage(file);

    const res = await fetch('/.netlify/functions/products-upsert', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title, sku, price, featured, imageAssetId })
    });
    setSaving(false);
    if (!res.ok) return alert(await res.text());
    f.reset();
    onSaved();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-3 bg-white/5 border border-white/20 rounded-lg p-4"
    >
      <div className="grid md:grid-cols-2 gap-3">
        <input
          name="title"
          placeholder="Title"
          required
          className="bg-transparent border border-white/30 rounded px-3 py-2"
        />
        <input
          name="sku"
          placeholder="SKU"
          className="bg-transparent border border-white/30 rounded px-3 py-2"
        />
        <input
          name="price"
          placeholder="Price"
          type="number"
          step="0.01"
          required
          className="bg-transparent border border-white/30 rounded px-3 py-2"
        />
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" name="featured" className="accent-white/80" />
          <span>Featured</span>
        </label>
        <input type="file" ref={fileRef} accept="image/*" className="text-sm" />
      </div>
      <div>
        <button
          disabled={saving}
          className="px-4 py-2 rounded bg-white text-accent hover:bg-white/90"
        >
          {saving ? 'Saving…' : 'Save Product'}
        </button>
      </div>
    </form>
  );
}
