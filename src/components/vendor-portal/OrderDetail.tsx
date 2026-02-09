import React from 'react';

type LineItem = {
  productRef?: { _id?: string; title?: string; sku?: string; image?: string };
  name?: string;
  sku?: string;
  quantity?: number;
  price?: number;
  total?: number;
};

type Order = {
  _id: string;
  orderNumber?: string;
  status?: string;
  paymentStatus?: string;
  createdAt?: string;
  cart?: LineItem[];
  amountSubtotal?: number;
  amountTax?: number;
  amountShipping?: number;
  totalAmount?: number;
};

const OrderDetail: React.FC<{ order: Order }> = ({ order }) => {
  const total =
    order.totalAmount ??
    (order.amountSubtotal || 0) + (order.amountTax || 0) + (order.amountShipping || 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-white/60">Order</p>
          <h1 className="text-3xl font-bold text-white">#{order.orderNumber || order._id}</h1>
          <p className="text-white/60 text-sm">
            {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '—'}{' '}
            • <span className="rounded-full bg-white/10 px-2 py-1 text-xs">{order.status || 'Processing'}</span>
            {order.paymentStatus && (
              <>
                {' '}
                •{' '}
                <span className="rounded-full bg-white/10 px-2 py-1 text-xs">
                  {order.paymentStatus}
                </span>
              </>
            )}
          </p>
        </div>
        <div className="text-right">
          <p className="text-white/60 text-sm">Total</p>
          <p className="text-2xl font-bold text-white">${(total || 0).toFixed(2)}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Items</h3>
          <div className="overflow-auto">
            <table className="min-w-full text-sm text-white/90">
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
                    <td className="px-2 py-1">{li.name || li.productRef?.title || '—'}</td>
                    <td className="px-2 py-1">{li.sku || li.productRef?.sku || '—'}</td>
                    <td className="px-2 py-1 text-right">{li.quantity || 0}</td>
                    <td className="px-2 py-1 text-right">${li.price?.toFixed(2) || '0.00'}</td>
                    <td className="px-2 py-1 text-right">${li.total?.toFixed(2) || '0.00'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Totals</h3>
            <div className="space-y-1 text-sm text-white/80">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${(order.amountSubtotal || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>${(order.amountTax || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>${(order.amountShipping || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-white">
                <span>Total</span>
                <span>${(total || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Payment</h3>
            <div className="text-sm text-white/80">
              Status: <span className="font-semibold">{order.paymentStatus || 'unpaid'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
