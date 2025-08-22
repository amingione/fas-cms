import React, { useState } from 'react';
import Drawer from './Drawer';

export default function QuoteEditorDrawer({
  open,
  onClose,
  initial,
  reload
}: {
  open: boolean;
  onClose: () => void;
  initial?: any;
  reload: () => void;
}) {
  const [q, setQ] = useState<any>(
    initial || { number: '', customerName: '', customerEmail: '', items: [], status: 'draft' }
  );
  const [saving, setSaving] = useState(false);

  function addItem() {
    setQ((v: any) => ({ ...v, items: [...(v.items || []), { title: '', qty: 1, price: 0 }] }));
  }
  function setItem(i: number, key: string, val: any) {
    const items = [...(q.items || [])];
    items[i] = { ...items[i], [key]: val };
    setQ({ ...q, items });
  }

  async function save() {
    setSaving(true);
    const res = await fetch('/.netlify/functions/quotes-upsert', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(q)
    });
    setSaving(false);
    if (!res.ok) return alert(await res.text());
    onClose();
    reload();
  }

  async function convertToInvoice() {
    const id = q._id;
    if (!id) return alert('Save quote first');
    const res = await fetch('/.netlify/functions/quotes-convert-to-invoice', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ quoteId: id })
    });
    const out = await res.json();
    if (!res.ok) return alert(out || 'Failed');
    window.open(out.hostedInvoiceUrl, '_blank');
  }

  const total = (q.items || []).reduce(
    (s: number, it: any) => s + Number(it.price || 0) * Number(it.qty || 1),
    0
  );

  return (
    <Drawer open={open} onClose={onClose} title={q._id ? `Quote ${q.number || ''}` : 'New Quote'}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <input
            placeholder="Quote #"
            value={q.number || ''}
            onChange={(e) => setQ({ ...q, number: e.target.value })}
            className="bg-transparent border border-white/20 rounded px-3 py-2"
          />
          <select
            value={q.status || 'draft'}
            onChange={(e) => setQ({ ...q, status: e.target.value })}
            className="bg-transparent border border-white/20 rounded px-3 py-2"
          >
            {['draft', 'sent', 'accepted', 'invoiced'].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            placeholder="Customer name"
            value={q.customerName || ''}
            onChange={(e) => setQ({ ...q, customerName: e.target.value })}
            className="bg-transparent border border-white/20 rounded px-3 py-2 col-span-2"
          />
          <input
            placeholder="Customer email"
            value={q.customerEmail || ''}
            onChange={(e) => setQ({ ...q, customerEmail: e.target.value })}
            className="bg-transparent border border-white/20 rounded px-3 py-2 col-span-2"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Items</div>
            <button
              onClick={addItem}
              className="px-3 py-1 rounded border border-white/20 hover:bg-white/10"
            >
              Add Item
            </button>
          </div>
          <div className="space-y-2">
            {(q.items || []).map((it: any, i: number) => (
              <div key={i} className="grid grid-cols-6 gap-2">
                <input
                  className="col-span-3 bg-transparent border border-white/20 rounded px-2 py-1"
                  placeholder="Title"
                  value={it.title || ''}
                  onChange={(e) => setItem(i, 'title', e.target.value)}
                />
                <input
                  type="number"
                  className="col-span-1 bg-transparent border border-white/20 rounded px-2 py-1"
                  placeholder="Qty"
                  value={it.qty || 1}
                  onChange={(e) => setItem(i, 'qty', Number(e.target.value))}
                />
                <input
                  type="number"
                  step="0.01"
                  className="col-span-2 bg-transparent border border-white/20 rounded px-2 py-1"
                  placeholder="Price"
                  value={it.price || 0}
                  onChange={(e) => setItem(i, 'price', Number(e.target.value))}
                />
              </div>
            ))}
          </div>
          <div className="text-right text-white/80">
            Total: <span className="font-semibold">${total.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 rounded bg-white text-black hover:bg-white/90"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={convertToInvoice}
            className="px-4 py-2 rounded border border-white/20 hover:bg-white/10"
          >
            Convert → Invoice
          </button>
        </div>
      </div>
    </Drawer>
  );
}
