import React, { useEffect, useMemo, useState } from 'react';

type Payment = {
  _id: string;
  description?: string;
  amount?: number;
  dueDate?: string;
  paid?: boolean;
  paidDate?: string;
  checkNumber?: string;
};

const PaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filter, setFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/vendor/payments', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to load payments');
      setPayments(data.payments || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return payments;
    return payments.filter((p) => (filter === 'paid' ? p.paid : !p.paid));
  }, [filter, payments]);

  const outstanding = useMemo(
    () =>
      payments
        .filter((p) => !p.paid)
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
        .toFixed(2),
    [payments]
  );

  if (loading) return <p className="text-white/80">Loading payments...</p>;
  if (error) return <p className="text-red-400">{error}</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Payments</h1>
          <p className="text-white/60 text-sm">Outstanding balance: ${outstanding}</p>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="bg-zinc-900 border border-white/20 text-white rounded px-3 py-2 text-sm"
        >
          <option value="all">All</option>
          <option value="paid">Paid</option>
          <option value="unpaid">Unpaid</option>
        </select>
      </div>
      <div className="overflow-auto rounded-lg border border-white/10">
        <table className="min-w-full text-sm text-white">
          <thead className="bg-white/5 text-left">
            <tr>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Due</th>
              <th className="px-4 py-3">Paid</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3">Check #</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p._id} className="border-t border-white/5">
                <td className="px-4 py-3">{p.description || '—'}</td>
                <td className="px-4 py-3 text-white/70">
                  {p.dueDate ? new Date(p.dueDate).toLocaleDateString() : '—'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      p.paid ? 'bg-green-500/20 text-green-200' : 'bg-yellow-500/20 text-yellow-200'
                    }`}
                  >
                    {p.paid ? 'Paid' : 'Unpaid'}
                  </span>
                  {p.paid && p.paidDate && (
                    <div className="text-xs text-white/60">
                      {new Date(p.paidDate).toLocaleDateString()}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-right">${(p.amount || 0).toFixed(2)}</td>
                <td className="px-4 py-3">{p.checkNumber || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PaymentsPage;
