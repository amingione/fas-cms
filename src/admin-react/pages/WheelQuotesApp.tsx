import React, { useEffect, useState } from 'react';

type QuoteRow = {
  _id: string;
  createdAt?: string;
  source?: string;
  fullname?: string;
  email?: string;
  phone?: string;
  series?: string;
  diameter?: string | number;
  width?: string | number;
  boltPattern?: string;
  backspacing?: string;
  finish?: string;
  beadlock?: string;
  status?: string;
};

export default function WheelQuotesApp() {
  const [rows, setRows] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [source, setSource] = useState<'all' | 'belak' | 'jtx'>('all');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const r = await fetch(`/api/wheel-quotes?source=${encodeURIComponent(source)}`);
        if (!r.ok) throw new Error('Bad status');
        const data = await r.json();
        if (!cancelled) setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) {
          setError('Failed to load');
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [source]);

  if (loading) return <p className="opacity-80">Loading...</p>;
  if (error) return <p className="text-red-400">{error}</p>;

  return (
    <>
      <div className="mb-3 flex items-center gap-2">
        <label className="text-sm text-white/70">Source:</label>
        <select
          value={source}
          onChange={(e) => setSource(e.target.value as any)}
          className="bg-transparent border border-white/20 rounded px-2 py-1 text-sm"
        >
          <option value="all">All</option>
          <option value="belak">Belak</option>
          <option value="jtx">JTX</option>
        </select>
      </div>

      <div className="overflow-x-auto border border-white/20 rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-white/5">
            <tr>
              {[
                'When',
                'Source',
                'Name',
                'Email',
                'Phone',
                'Series',
                'Spec',
                'Bolt',
                'Backspacing',
                'Finish',
                'Beadlock',
                'Status'
              ].map((h) => (
                <th key={h} className="text-left px-3 py-2">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id} className="border-t border-white/20 hover:bg-white/5 transition">
                <td className="px-3 py-2 whitespace-nowrap">
                  {r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}
                </td>
                <td className="px-3 py-2">{r.source || '—'}</td>
                <td className="px-3 py-2">{r.fullname || '—'}</td>
                <td className="px-3 py-2">{r.email || '—'}</td>
                <td className="px-3 py-2">{r.phone || '—'}</td>
                <td className="px-3 py-2">{r.series || '—'}</td>
                <td className="px-3 py-2">{`${r.diameter || ''}x${r.width || ''}`}</td>
                <td className="px-3 py-2">{r.boltPattern || '—'}</td>
                <td className="px-3 py-2">{r.backspacing || '—'}</td>
                <td className="px-3 py-2">{r.finish || '—'}</td>
                <td className="px-3 py-2">{r.beadlock || '—'}</td>
                <td className="px-3 py-2">{r.status || 'new'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

