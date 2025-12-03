import React, { useEffect, useState } from 'react';

type Analytics = {
  totalOrders: number;
  revenueThisMonth: number;
  topProducts: { name: string; count: number }[];
};

const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/vendor/analytics', { credentials: 'include' });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.message || 'Failed to load analytics');
      setData(body.analytics || null);
    } catch (err: any) {
      setError(err?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <p className="text-white/80">Loading analytics...</p>;
  if (error) return <p className="text-red-400">{error}</p>;
  if (!data) return <p className="text-white/80">No analytics available.</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Analytics</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <p className="text-white/60 text-sm">Total Orders</p>
          <p className="text-3xl font-bold text-white">{data.totalOrders ?? 0}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <p className="text-white/60 text-sm">Revenue This Month</p>
          <p className="text-3xl font-bold text-white">
            ${Number(data.revenueThisMonth || 0).toFixed(2)}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <p className="text-white/60 text-sm">Avg Order Value</p>
          <p className="text-3xl font-bold text-white">
            $
            {data.totalOrders > 0
              ? (Number(data.revenueThisMonth || 0) / data.totalOrders).toFixed(2)
              : '0.00'}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <p className="text-lg font-semibold text-white mb-3">Top Products</p>
        <div className="space-y-2">
          {data.topProducts && data.topProducts.length ? (
            data.topProducts.map((p) => (
              <div key={p.name} className="flex items-center justify-between text-sm text-white">
                <span>{p.name}</span>
                <span className="text-white/70">{p.count} units</span>
              </div>
            ))
          ) : (
            <p className="text-white/70 text-sm">No product data yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
