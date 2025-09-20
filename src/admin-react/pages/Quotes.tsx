import { useEffect, useState } from 'react';
import QuoteEditorDrawer from '@/components/admin/QuoteEditorDrawer';

type Quote = {
  _id?: string;
  number?: string;
  customerName?: string;
  customerEmail?: string;
  status?: string;
  total?: number;
  stripeInvoiceNumber?: string;
  stripeHostedInvoiceUrl?: string;
};

export default function QuotesPage() {
  const [rows, setRows] = useState<Quote[]>([]);
  const [open, setOpen] = useState(false);
  const [initial, setInitial] = useState<Quote | null>(null);
  const [filter, setFilter] = useState('all');

  async function load() {
    try {
      const r = await fetch('/.netlify/functions/quotes-list');
      const data = await r.json();
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function newQuote() {
    setInitial(null);
    setOpen(true);
  }

  return (
    <div className="text-white">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Quotes</h1>
          <p className="text-white/70 text-sm">Draft and send quotes stored in Sanity.</p>
        </div>
        <button className="btn-glass btn-primary" onClick={newQuote}>
          New Quote
        </button>
      </div>

      <div className="mb-3 flex items-center gap-2 text-xs">
        {['all', 'draft', 'sent', 'invoiced', 'paid'].map((f) => (
          <button
            key={f}
            className={`px-2 py-1 rounded border ${
              filter === f ? 'bg-white text-accent border-white' : 'border-white/30 hover:bg-white/10'
            }`}
            onClick={() => setFilter(f)}
          >
            {f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto border border-white/20 rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-white/5">
            <tr>
              {['Quote', 'Customer', 'Status', 'Total', 'Actions'].map((h) => (
                <th key={h} className="text-left px-3 py-2">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows
              .filter((r) => {
                if (filter === 'all') return true;
                const st = (r.status || 'draft').toLowerCase();
                if (filter === 'sent') return st === 'sent' || st === 'invoiced';
                return st === filter;
              })
              .map((r) => (
                <tr key={r._id} className="border-t border-white/20 hover:bg-white/5 transition">
                  <td className="px-3 py-2">
                    <div>{r.number || (r._id || '').slice(-6)}</div>
                    {r.stripeInvoiceNumber ? (
                      <div className="text-xs text-white/70">INV: {r.stripeInvoiceNumber}</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">{r.customerName || r.customerEmail || '—'}</td>
                  <td className="px-3 py-2">
                    {(() => {
                      const st = (r.status || 'draft').toLowerCase();
                      const cls =
                        st === 'paid'
                          ? 'bg-green-600/20 text-green-400 border-green-500/30'
                          : st === 'sent' || st === 'invoiced'
                          ? 'bg-blue-600/20 text-blue-400 border-blue-500/30'
                          : 'bg-white/10 text-white border-white/30';
                      const label = st.charAt(0).toUpperCase() + st.slice(1);
                      return <span className={`inline-block text-xs px-2 py-0.5 rounded-full border ${cls}`}>{label}</span>;
                    })()}
                  </td>
                  <td className="px-3 py-2">${Number(r.total || 0).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right space-x-2">
                    <button className="btn-glass btn-sm btn-primary" onClick={() => { setInitial(r); setOpen(true); }}>
                      Edit
                    </button>
                    {r.stripeHostedInvoiceUrl ? (
                      <a className="btn-glass btn-sm btn-outline" href={r.stripeHostedInvoiceUrl} target="_blank">
                        Open Invoice
                      </a>
                    ) : (
                      <button
                        className="btn-glass btn-sm btn-outline"
                        onClick={async () => {
                          try {
                            const rr = await fetch('/.netlify/functions/quotes-send', {
                              method: 'POST',
                              headers: { 'content-type': 'application/json' },
                              body: JSON.stringify({ quoteId: r._id })
                            });
                            if (!rr.ok) throw new Error(await rr.text());
                            alert('Sent');
                            load();
                          } catch (e) {
                            alert('Send failed');
                          }
                        }}
                      >
                        Send
                      </button>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <QuoteEditorDrawer open={open} onClose={() => setOpen(false)} initial={initial as any} reload={load} />
    </div>
  );
}

