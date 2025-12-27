import React, { useCallback, useEffect, useMemo, useState } from 'react';

type LineItem = {
  name?: string;
  sku?: string;
  quantity?: number;
  price?: number;
  total?: number;
  productRef?: { _id?: string; title?: string; sku?: string };
};

type Order = {
  _id: string;
  orderNumber?: string;
  status?: string;
  createdAt?: string;
  totalAmount?: number;
  amountSubtotal?: number;
  amountTax?: number;
  amountShipping?: number;
  cart?: LineItem[];
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-300',
  approved: 'bg-blue-500/20 text-blue-200',
  processing: 'bg-blue-500/20 text-blue-200',
  paid: 'bg-green-500/20 text-green-200',
  shipped: 'bg-indigo-500/20 text-indigo-200',
  received: 'bg-green-500/20 text-green-200',
  completed: 'bg-green-500/20 text-green-200',
  cancelled: 'bg-red-500/20 text-red-200'
};

const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = statusFilter !== 'all' ? `?status=${encodeURIComponent(statusFilter)}` : '';
      const res = await fetch(`/api/vendor/orders${qs}`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to load orders');
      setOrders(data.orders || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const total = useMemo(() => {
    const sum = orders.reduce((acc, order) => {
      const base =
        typeof order.totalAmount === 'number'
          ? order.totalAmount
          : (order.amountSubtotal || 0) + (order.amountTax || 0) + (order.amountShipping || 0);
      return acc + (Number.isFinite(base) ? base : 0);
    }, 0);
    return sum.toFixed(2);
  }, [orders]);

  if (loading) return <p className="text-white/80">Loading orders...</p>;
  if (error)
    return (
      <div className="text-red-400">
        {error}
        <button className="ml-3 underline" onClick={load}>
          Retry
        </button>
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Wholesale Orders</h1>
          <p className="text-white/60 text-sm">Total value: ${total}</p>
        </div>
        <div className="flex gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-zinc-900 border border-white/20 text-white rounded px-3 py-2 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="processing">Processing</option>
            <option value="paid">Paid</option>
            <option value="completed">Completed</option>
            <option value="shipped">Shipped</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="overflow-auto rounded-lg border border-white/10">
        <table className="min-w-full text-sm text-white">
          <thead className="bg-white/5 text-left">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const badge =
                statusColors[(order.status || '').toLowerCase()] ||
                'bg-white/10 text-white/80';
              const totalValue =
                order.totalAmount ??
                (order.amountSubtotal || 0) + (order.amountTax || 0) + (order.amountShipping || 0);
              return (
                <React.Fragment key={order._id}>
                  <tr className="border-t border-white/5">
                    <td className="px-4 py-3 font-semibold">{order.orderNumber || order._id}</td>
                    <td className="px-4 py-3 text-white/70">
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${badge}`}>
                        {order.status || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">${(totalValue || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right space-x-3">
                      <a
                        href={`/vendor-portal/orders/${order._id}`}
                        className="text-primary hover:underline"
                      >
                        Open
                      </a>
                      <button
                        className="text-primary hover:underline"
                        onClick={() =>
                          setExpanded((prev) => (prev === order._id ? null : order._id))
                        }
                      >
                        {expanded === order._id ? 'Hide Items' : 'Items'}
                      </button>
                    </td>
                  </tr>
                  {expanded === order._id && (
                    <tr className="border-t border-white/5 bg-white/5">
                      <td colSpan={6} className="px-6 py-4">
                        <h3 className="text-sm font-semibold mb-2 text-white">Items</h3>
                        <div className="overflow-auto">
                          <table className="min-w-full text-xs text-white/90">
                            <thead className="text-left">
                              <tr>
                                <th className="px-2 py-1">Product</th>
                                <th className="px-2 py-1">SKU</th>
                                <th className="px-2 py-1 text-right">Qty</th>
                                <th className="px-2 py-1 text-right">Unit</th>
                                <th className="px-2 py-1 text-right">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(order.cart || []).map((li, idx) => (
                                <tr key={idx} className="border-t border-white/5">
                                  <td className="px-2 py-1">
                                    {li.name || li.productRef?.title || '—'}
                                  </td>
                                  <td className="px-2 py-1">{li.sku || li.productRef?.sku || '—'}</td>
                                  <td className="px-2 py-1 text-right">{li.quantity || 0}</td>
                                  <td className="px-2 py-1 text-right">
                                    ${li.price?.toFixed(2) || '0.00'}
                                  </td>
                                  <td className="px-2 py-1 text-right">
                                    ${li.total?.toFixed(2) || '0.00'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrdersPage;
