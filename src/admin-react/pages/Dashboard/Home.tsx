import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";

type OrderRow = { _id: string; orderNumber?: string; total?: number; status?: string; customerEmail?: string; items?: any[] };

export default function Home() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const revenue = orders.reduce((s, o) => s + (Number((o as any).total) || 0), 0);

  useEffect(() => {
    (async () => {
      try {
        const r1 = await fetch('/.netlify/functions/orders-list').then(r=>r.json()).catch(() => ({ data: [] }));
        setOrders(Array.isArray(r1?.data) ? r1.data.slice(0, 8) : Array.isArray(r1) ? r1.slice(0,8) : []);
      } catch {}
      try {
        const r2 = await fetch('/.netlify/functions/products-list').then(r=>r.json()).catch(() => ({ data: [] }));
        setProducts(Array.isArray(r2?.data) ? r2.data : Array.isArray(r2) ? r2 : []);
      } catch {}
    })();
  }, []);

  return (
    <>
      <PageMeta title="Admin · Overview" description="Operational overview" />
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        {/* KPI cards */}
        <div className="col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-lg border border-white/15 bg-white/5 p-4">
            <div className="text-sm text-white/60">Orders</div>
            <div className="text-2xl font-semibold">{orders.length}</div>
          </div>
          <div className="rounded-lg border border-white/15 bg-white/5 p-4">
            <div className="text-sm text-white/60">Revenue (approx)</div>
            <div className="text-2xl font-semibold">${revenue.toFixed(2)}</div>
          </div>
          <div className="rounded-lg border border-white/15 bg-white/5 p-4">
            <div className="text-sm text-white/60">Products</div>
            <div className="text-2xl font-semibold">{products.length}</div>
          </div>
          <div className="rounded-lg border border-white/15 bg-white/5 p-4">
            <div className="text-sm text-white/60">Open</div>
            <div className="text-2xl font-semibold">{orders.filter(o => (o.status||'').toLowerCase() !== 'paid').length}</div>
          </div>
        </div>

        {/* Recent orders */}
        <div className="col-span-12">
          <div className="overflow-hidden rounded-2xl border border-white/15 bg-white/5">
            <div className="flex items-center justify-between p-4">
              <h3 className="text-lg font-semibold">Recent Orders</h3>
              <a className="text-sm underline" href="/admin/orders">See all</a>
            </div>
            <div className="max-w-full overflow-x-auto">
              <table className="min-w-full text-sm border-t border-white/10">
                <thead className="bg-white/5">
                  <tr>
                    {['Order','Customer','Status','Total'].map(h => <th key={h} className="text-left px-4 py-2">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o._id} className="border-t border-white/10">
                      <td className="px-4 py-2">{o.orderNumber || o._id?.slice(-6)}</td>
                      <td className="px-4 py-2">{(o as any).customerName || o.customerEmail || '—'}</td>
                      <td className="px-4 py-2">{o.status || '—'}</td>
                      <td className="px-4 py-2">${Number((o as any).total || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr><td className="px-4 py-6 text-white/60" colSpan={4}>No orders found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
