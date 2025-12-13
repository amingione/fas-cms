'use client';

import { useEffect, useState } from 'react';

interface WheelQuote {
  id: string;
  customerName: string;
  email: string;
  vehicle: string;
  createdAt: string;
  status: 'new' | 'in_progress' | 'completed';
}

const statusClasses: Record<WheelQuote['status'], string> = {
  new: 'bg-blue-500/10 text-blue-300 border border-blue-500/40',
  in_progress: 'bg-amber-500/10 text-amber-300 border border-amber-500/40',
  completed: 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/40'
};

export default function WheelQuotesApp() {
  const [quotes, setQuotes] = useState<WheelQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadQuotes() {
      try {
        setLoading(true);
        const res = await fetch('/api/admin/wheel-quotes', { signal: controller.signal });
        if (!res.ok) throw new Error('Unable to load wheel quote data');
        const data = (await res.json()) as WheelQuote[];
        setQuotes(data);
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        setLoading(false);
      }
    }

    void loadQuotes();

    return () => controller.abort();
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-white/10 bg-dark/40 p-6 text-sm text-white/70">
        Loading wheel quotes…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-200">
        {error}
      </div>
    );
  }

  if (quotes.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-dark/40 p-6 text-sm text-white/70">
        No wheel quotes found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {quotes.map((quote) => (
        <article
          key={quote.id}
          className="rounded-xl border border-white/10 bg-dark/60 p-4 text-sm text-white/80 shadow-inner shadow-black/40"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-white">{quote.customerName}</h3>
              <p className="text-xs text-white/60">{quote.email}</p>
            </div>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs uppercase tracking-wide ${statusClasses[quote.status]}`}
            >
              {quote.status.replace('_', ' ')}
            </span>
          </div>
          <dl className="mt-3 grid gap-2 text-xs text-white/60 sm:grid-cols-3">
            <div>
              <dt className="font-semibold text-white/70">Vehicle</dt>
              <dd>{quote.vehicle}</dd>
            </div>
            <div>
              <dt className="font-semibold text-white/70">Submitted</dt>
              <dd>{new Date(quote.createdAt).toLocaleString()}</dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  );
}
