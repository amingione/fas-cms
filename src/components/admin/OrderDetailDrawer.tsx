import React, { useEffect, useState } from 'react';
import Drawer from './Drawer';
import { useToast } from './Toast';

export default function OrderDetailDrawer({
  open,
  onClose,
  orderId,
  refresh
}: {
  open: boolean;
  onClose: () => void;
  orderId?: string;
  refresh: () => void;
}) {
  const { push } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !orderId) return;
    setLoading(true);
    fetch('/.netlify/functions/order-detail?id=' + encodeURIComponent(orderId))
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [open, orderId]);

  async function updateStatus(status: string) {
    const res = await fetch('/.netlify/functions/order-update-status', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ _id: orderId, status })
    });
    if (!res.ok) return push(await res.text());
    push('Status updated');
    refresh();
  }

  async function createLabel() {
    if (!data) return;
    const payload = {
      orderId,
      shipment: {
        service_code: 'usps_priority_mail', // adjust to your carriers/services
        ship_to: data.shippingAddress,
        ship_from: data.billingAddress || data.shippingAddress, // set your warehouse address in real impl
        packages: [{ weight: { value: 1, unit: 'pound' } }]
      }
    };
    const res = await fetch('/.netlify/functions/shipengine-label-create', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const out = await res.json();
    if (!res.ok) return push(out || 'Label failed');
    push('Label created');
    window.open(out.labelUrl, '_blank'); // PDF
    refresh();
  }

  return (
    <Drawer open={open} onClose={onClose} title={data ? `Order ${data.orderNumber}` : 'Order'}>
      {loading ? (
        <div>Loading…</div>
      ) : !data ? (
        <div className="text-white/70">No data.</div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-white/60">
                {new Date(data.orderDate).toLocaleString()}
              </div>
              <div className="text-xl font-semibold">
                {data.customerName}{' '}
                <span className="text-white/60">({data.customerEmail || '—'})</span>
              </div>
            </div>
            <div className="flex gap-2">
              <select
                className="bg-transparent border border-white/20 rounded px-2 py-1"
                value={data.status}
                onChange={(e) => {
                  setData({ ...data, status: e.target.value });
                  updateStatus(e.target.value);
                }}
              >
                {['pending', 'paid', 'fulfilled', 'shipped', 'cancelled', 'refunded'].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button
                onClick={createLabel}
                className="px-3 py-2 rounded bg-white text-black hover:bg-white/90"
              >
                Create Label
              </button>
            </div>
          </div>

          <div className="border border-white/10 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-left p-2">Item</th>
                  <th className="text-left p-2">Qty</th>
                  <th className="text-left p-2">Price</th>
                </tr>
              </thead>
              <tbody>
                {(data.items || []).map((it: any, i: number) => (
                  <tr key={i} className="border-t border-white/10">
                    <td className="p-2">{it.title || it.sku}</td>
                    <td className="p-2">{it.qty}</td>
                    <td className="p-2">${Number(it.price || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-sm text-white/80">
            <div className="font-semibold mb-1">Shipments</div>
            <ul className="space-y-1">
              {(data.shipments || []).map((s: any, i: number) => (
                <li
                  key={i}
                  className="flex items-center justify-between border border-white/10 rounded px-3 py-2"
                >
                  <span>
                    {s.carrier} • {s.trackingNumber || '—'}
                  </span>
                  {s.labelUrl ? (
                    <a className="underline" href={s.labelUrl} target="_blank">
                      Label PDF
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Drawer>
  );
}
