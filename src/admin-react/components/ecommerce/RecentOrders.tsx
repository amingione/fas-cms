import { useEffect, useState } from 'react';

type Order = { _id: string; orderNumber?: string; customerEmail?: string; status?: string; total?: number };

export default function RecentOrders() {
  const [rows, setRows] = useState<Order[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/.netlify/functions/orders-list');
        const j = await r.json();
        const list: Order[] = Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : [];
        setRows(list.slice(0, 8));
      } catch {
        setRows([]);
      }
    })();
  }, []);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/15 bg-white/5 px-4 pb-3 pt-4 sm:px-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Recent Orders</h3>
        <a href="/admin/orders" className="text-sm underline">See all</a>
      </div>
      <div className="max-w-full overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="border-y border-white/10">
            <tr>
              {['Order','Customer','Status','Total'].map(h => <th key={h} className="text-left py-2 px-3 text-white/70">{h}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {rows.map((o) => (
              <tr key={o._id} className="hover:bg-white/5">
                <td className="py-2 px-3">{o.orderNumber || o._id?.slice(-6)}</td>
                <td className="py-2 px-3">{(o as any).customerName || o.customerEmail || '—'}</td>
                <td className="py-2 px-3">{o.status || '—'}</td>
                <td className="py-2 px-3">${Number(o.total || 0).toFixed(2)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td className="py-6 px-3 text-white/60" colSpan={4}>No orders found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
