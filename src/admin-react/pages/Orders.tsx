import { useEffect, useState } from 'react';
import OrderDetailDrawer from '@/components/admin/OrderDetailDrawer';

type Row = {
  _id: string;
  orderNumber: string;
  status: string;
  total: number;
  customerName?: string;
  customerEmail?: string;
  orderDate?: string;
};

export default function OrdersPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [id, setId] = useState<string | null>(null);

  async function refresh() {
    try {
      const r = await fetch('/.netlify/functions/orders-list');
      const j = await r.json();
      const list: Row[] = Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : [];
      setRows(list);
    } catch {
      setRows([]);
    }
  }
  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="text-white">
      <div className="mb-4">
        <h1 className="text-2xl md:text-3xl font-bold">Orders</h1>
        <p className="text-white/70 text-sm">Orders from Sanity (with Stripe fallback).</p>
      </div>

      <div className="overflow-x-auto border border-white/20 rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-white/5">
            <tr>
              {['Order', '# Items', 'Customer', 'Status', 'Total', ''].map((h) => (
                <th key={h} className="text-left px-3 py-2">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r._id} className="border-t border-white/20 hover:bg-white/5 transition">
                <td className="px-3 py-2">{r.orderNumber || r._id?.slice(-6)}</td>
                <td className="px-3 py-2">{Array.isArray(r.items) ? r.items.length : 0}</td>
                <td className="px-3 py-2">{r.customerName || r.customerEmail || '—'}</td>
                <td className="px-3 py-2">{r.status || '—'}</td>
                <td className="px-3 py-2">${Number(r.total || 0).toFixed(2)}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    className="btn-glass btn-sm btn-primary"
                    onClick={() => {
                      setId(r._id);
                      setOpen(true);
                    }}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <OrderDetailDrawer open={open} onClose={() => setOpen(false)} orderId={id || ''} refresh={refresh} />
    </div>
  );
}

