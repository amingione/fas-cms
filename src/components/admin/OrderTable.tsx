import React from 'react';
type Item = { title: string; qty: number; price: number };
type Row = {
  _id: string;
  orderNumber: string;
  status: string;
  total: number;
  customerName?: string;
  orderDate: string;
  items: Item[];
};
export default function OrderTable({ rows }: { rows: Row[] }) {
  return (
    <div className="overflow-x-auto border border-white/10 rounded-lg">
      <table className="min-w-full text-sm">
        <thead className="bg-white/5">
          <tr className="[&>th]:text-left [&>th]:px-3 [&>th]:py-2">
            <th>Order</th>
            <th>Date</th>
            <th>Customer</th>
            <th>Status</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r._id} className="border-t border-white/10 [&>td]:px-3 [&>td]:py-2">
              <td>{r.orderNumber}</td>
              <td>{new Date(r.orderDate).toLocaleString()}</td>
              <td>{r.customerName || '—'}</td>
              <td>{r.status}</td>
              <td>${(r.total || 0).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
