import React, { useEffect, useState } from 'react';

type ReturnEntry = {
  _id: string;
  rmaNumber?: string;
  status?: string;
  reason?: string;
  createdAt?: string;
  refundAmount?: number;
  order?: { poNumber?: string };
};

const ReturnsTable: React.FC = () => {
  const [returns, setReturns] = useState<ReturnEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ orderId: '', reason: 'other', description: '' });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/vendor/returns', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to load returns');
      setReturns(data.returns || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load returns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/vendor/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...form, items: [] })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to submit return');
      setForm({ orderId: '', reason: 'other', description: '' });
      load();
    } catch (err: any) {
      setError(err?.message || 'Failed to submit return');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Returns & RMA</h1>
      </div>
      {loading ? (
        <p className="text-white/80">Loading returns...</p>
      ) : error ? (
        <p className="text-red-400">{error}</p>
      ) : (
        <div className="overflow-auto rounded-lg border border-white/10">
          <table className="min-w-full text-sm text-white">
            <thead className="bg-white/5 text-left">
              <tr>
                <th className="px-4 py-3">RMA #</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {returns.map((r) => (
                <tr key={r._id} className="border-t border-white/5">
                  <td className="px-4 py-3">{r.rmaNumber || '—'}</td>
                  <td className="px-4 py-3">{r.order?.poNumber || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-full text-xs bg-white/10">{r.status || 'pending'}</span>
                  </td>
                  <td className="px-4 py-3 text-white/70">{r.reason || '—'}</td>
                  <td className="px-4 py-3 text-white/60">
                    {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
              {!returns.length && (
                <tr>
                  <td className="px-4 py-3 text-white/70" colSpan={5}>
                    No returns yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <h2 className="text-lg font-semibold text-white mb-3">Submit a Return</h2>
        <form className="space-y-3" onSubmit={submit}>
          <input
            value={form.orderId}
            onChange={(e) => setForm({ ...form, orderId: e.target.value })}
            placeholder="Related Order ID (optional)"
            className="w-full bg-zinc-900 border border-white/20 text-white rounded px-3 py-2 text-sm"
          />
          <select
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            className="w-full bg-zinc-900 border border-white/20 text-white rounded px-3 py-2 text-sm"
          >
            <option value="defective">Defective</option>
            <option value="wrong_item">Wrong item</option>
            <option value="damaged">Damaged</option>
            <option value="not_as_described">Not as described</option>
            <option value="other">Other</option>
          </select>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Describe the issue"
            rows={4}
            className="w-full bg-zinc-900 border border-white/20 text-white rounded px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="bg-primary text-white rounded px-4 py-2 text-sm disabled:opacity-50"
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : 'Submit Return'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ReturnsTable;
