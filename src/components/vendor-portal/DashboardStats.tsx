import React from 'react';

type Stats = {
  ordersThisMonth: number;
  ordersLastMonth: number;
  pendingInvoices: { count: number; total: number };
  lowStockItems: number;
  outstandingPayments: number;
};

interface Props {
  stats: Stats;
}

const Card = ({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) => (
  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
    <p className="text-xs uppercase tracking-wide text-white/60">{label}</p>
    <p className="text-2xl font-bold text-white mt-1">{value}</p>
    {sub && <p className="text-xs text-white/60 mt-1">{sub}</p>}
  </div>
);

const DashboardStats: React.FC<Props> = ({ stats }) => {
  const delta =
    stats.ordersLastMonth > 0
      ? (((stats.ordersThisMonth - stats.ordersLastMonth) / stats.ordersLastMonth) * 100).toFixed(1)
      : '—';
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card label="Orders This Month" value={stats.ordersThisMonth} sub={`vs last month: ${delta}%`} />
      <Card
        label="Pending Invoices"
        value={`${stats.pendingInvoices.count} (${stats.pendingInvoices.total.toFixed(2)})`}
      />
      <Card label="Low Stock Alerts" value={stats.lowStockItems} />
      <Card
        label="Outstanding Payments"
        value={`$${stats.outstandingPayments.toFixed(2)}`}
      />
    </div>
  );
};

export default DashboardStats;
