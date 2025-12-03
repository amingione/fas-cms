import React, { useEffect, useState } from 'react';

type Invoice = {
  _id: string;
  invoiceNumber?: string;
  status?: string;
  invoiceDate?: string;
  dueDate?: string;
  total?: number;
  amountPaid?: number;
  amountDue?: number;
  customerRef?: { companyName?: string };
};

const InvoicesPage: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/vendor/invoices', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to load invoices');
      setInvoices(data.invoices || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <p className="text-white/80">Loading invoices...</p>;
  if (error) return <p className="text-red-400">{error}</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Invoices</h1>
          <p className="text-white/60 text-sm">Submitted invoices and status.</p>
        </div>
      </div>
      <div className="overflow-auto rounded-lg border border-white/10">
        <table className="min-w-full text-sm text-white">
          <thead className="bg-white/5 text-left">
            <tr>
              <th className="px-4 py-3">Invoice #</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Due</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-right">Paid</th>
              <th className="px-4 py-3 text-right">Due</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv._id} className="border-t border-white/5">
                <td className="px-4 py-3 font-semibold">{inv.invoiceNumber || '—'}</td>
                <td className="px-4 py-3 text-white/70">
                  {inv.customerRef?.companyName || '—'}
                </td>
                <td className="px-4 py-3 text-white/70">
                  {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString() : '—'}
                </td>
                <td className="px-4 py-3 text-white/70">
                  {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 rounded-full text-xs bg-white/10">
                    {inv.status || 'Unknown'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">${(inv.total || 0).toFixed(2)}</td>
                <td className="px-4 py-3 text-right">${(inv.amountPaid || 0).toFixed(2)}</td>
                <td className="px-4 py-3 text-right">${(inv.amountDue || 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InvoicesPage;
