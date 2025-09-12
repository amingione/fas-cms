import { useEffect, useMemo, useState } from 'react';

type Customer = {
  id: string;
  name?: string;
  email?: string;
  created?: string;
  livemode?: boolean;
};

export default function CustomersPage() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  async function load() {
    try {
      const r = await fetch('/.netlify/functions/customers-list');
      const j = await r.json();
      const stripeRows: any[] = Array.isArray(j?.data) ? j.data : [];
      // Fetch sanity profiles and mark
      let profiles: any[] = [];
      try {
        const pr = await fetch('/.netlify/functions/customers-profile-list');
        if (pr.ok) profiles = await pr.json();
      } catch {}
      const profileEmails = new Set(
        profiles
          .map((p) => (p?.email || '').toString().trim().toLowerCase())
          .filter(Boolean)
      );
      setRows(
        stripeRows.map((c) => ({
          ...c,
          hasProfile: profileEmails.has((c?.email || '').toString().trim().toLowerCase())
        })) as any
      );
    } catch {
      setRows([]);
    }
  }
  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const qq = q.toLowerCase();
    return rows.filter((c) =>
      (c.name || '').toLowerCase().includes(qq) || (c.email || '').toLowerCase().includes(qq)
    );
  }, [rows, q]);

  async function openDetail(id: string) {
    try {
      const r = await fetch('/.netlify/functions/customers-detail?id=' + encodeURIComponent(id));
      const j = await r.json();
      setDetail(j);
      // Load Sanity profile by email (if we have one)
      const email = (j?.customer?.email || '').trim();
      if (email) {
        try {
          const pr = await fetch('/.netlify/functions/customers-profile-get?email=' + encodeURIComponent(email));
          const pj = await pr.json();
          setProfile(pj);
        } catch {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setOpen(true);
    } catch {
      setDetail(null);
      setOpen(false);
    }
  }

  return (
    <div className="text-white">
      <div className="mb-4">
        <h1 className="text-2xl md:text-3xl font-bold">Customers</h1>
        <p className="text-white/70 text-sm">Search and view customers. (Stripe-backed)</p>
      </div>

      <div className="mb-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or email"
          className="bg-transparent border border-white/30 rounded px-3 py-2 w-full max-w-sm"
        />
      </div>

      <div className="overflow-x-auto border border-white/20 rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-white/5">
            <tr>
              {['Name', 'Email', 'Created', ''].map((h) => (
                <th key={h} className="text-left px-3 py-2">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c: any) => (
              <tr key={c.id} className="border-t border-white/20 hover:bg-white/5 transition">
                <td className="px-3 py-2">{c.name || '—'}</td>
                <td className="px-3 py-2">
                  {c.email || '—'}
                  {c.hasProfile ? (
                    <span className="ml-2 inline-block text-[10px] px-1.5 py-0.5 rounded-full border border-white/30">Profile</span>
                  ) : null}
                </td>
                <td className="px-3 py-2">{c.created ? new Date(c.created).toLocaleString() : ''}</td>
                <td className="px-3 py-2 text-right space-x-2">
                  <button className="btn-glass btn-sm btn-primary" onClick={() => openDetail(c.id)}>
                    View
                  </button>
                  <a
                    className="btn-glass btn-sm btn-outline"
                    href={`https://dashboard.stripe.com/${c.livemode ? '' : 'test/'}customers/${c.id}`}
                    target="_blank"
                  >
                    Open in Stripe
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && detail && (
        <div className="fixed inset-0 z-[1000]">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-full md:w-[520px] bg-neutral-950 border-l border-white/20 overflow-auto">
            <div className="sticky top-0 px-4 py-3 border-b border-white/20 bg-neutral-950/95 backdrop-blur flex items-center justify-between">
              <div className="font-semibold">Customer</div>
              <button className="btn-glass btn-sm btn-dark" onClick={() => setOpen(false)}>
                ✕
              </button>
            </div>
            <div className="p-4 space-y-6">
              <div className="flex items-start justify-between">
                <div className="text-lg font-semibold">{detail?.customer?.name || '—'}</div>
                <div className="text-white/80">{detail?.customer?.email || ''}</div>
              </div>
              <div className="text-white/70 text-sm">
                Created: {detail?.customer?.created ? new Date(detail.customer.created).toLocaleString() : ''}
              </div>

              {/* Sanity Profile (Editable) */}
              <div className="border border-white/20 rounded-lg p-3">
                <div className="font-semibold mb-2">Profile (Sanity)</div>
                <div className="grid gap-2">
                  <label className="grid gap-1 text-sm">
                    <span className="text-white/70">Name</span>
                    <input
                      className="bg-transparent border border-white/30 rounded px-3 py-2"
                      value={profile?.name ?? detail?.customer?.name ?? ''}
                      onChange={(e) => setProfile({ ...(profile || {}), name: e.target.value })}
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="text-white/70">Email</span>
                    <input
                      className="bg-transparent border border-white/30 rounded px-3 py-2"
                      value={profile?.email ?? detail?.customer?.email ?? ''}
                      onChange={(e) => setProfile({ ...(profile || {}), email: e.target.value })}
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="text-white/70">Phone</span>
                    <input
                      className="bg-transparent border border-white/30 rounded px-3 py-2"
                      value={profile?.phone ?? ''}
                      onChange={(e) => setProfile({ ...(profile || {}), phone: e.target.value })}
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="text-white/70">Notes</span>
                    <textarea
                      className="bg-transparent border border-white/30 rounded px-3 py-2"
                      rows={2}
                      value={profile?.notes ?? ''}
                      onChange={(e) => setProfile({ ...(profile || {}), notes: e.target.value })}
                    />
                  </label>
                  <div className="text-right">
                    <button
                      className="btn-glass btn-primary"
                      onClick={async () => {
                        try {
                          const payload = {
                            _id: profile?._id,
                            name: profile?.name ?? detail?.customer?.name ?? '',
                            email: profile?.email ?? detail?.customer?.email ?? '',
                            phone: profile?.phone ?? '',
                            notes: profile?.notes ?? '',
                          };
                          const res = await fetch('/.netlify/functions/customers-profile-upsert', {
                            method: 'POST',
                            headers: { 'content-type': 'application/json' },
                            body: JSON.stringify(payload)
                          });
                          if (!res.ok) throw new Error(await res.text());
                          const out = await res.json();
                          setProfile(out);
                          alert('Profile saved');
                        } catch (e) {
                          alert('Save failed');
                        }
                      }}
                    >
                      Save Profile
                    </button>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/20 pt-3">
                <div className="font-semibold mb-2">Payment Methods</div>
                {Array.isArray(detail?.paymentMethods) && detail.paymentMethods.length ? (
                  <ul className="space-y-1">
                    {detail.paymentMethods.map((pm: any) => (
                      <li className="text-sm text-white/80">
                        {(pm.brand || 'CARD').toUpperCase()} •••• {pm.last4} &nbsp; exp {pm.exp_month}/{pm.exp_year}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-white/70 text-sm">No cards on file.</div>
                )}
              </div>

              <div className="border-t border-white/20 pt-3">
                <div className="font-semibold mb-2">Invoices</div>
                {Array.isArray(detail?.invoices) && detail.invoices.length ? (
                  <div className="overflow-x-auto border border-white/20 rounded">
                    <table className="min-w-full text-sm">
                      <thead className="bg-white/5">
                        <tr>
                          <th className="text-left px-3 py-2">Number</th>
                          <th className="text-left px-3 py-2">Status</th>
                          <th className="text-left px-3 py-2">Total</th>
                          <th className="text-left px-3 py-2">Created</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.invoices.map((inv: any) => (
                          <tr className="border-t border-white/20">
                            <td className="px-3 py-2">{inv.number || inv.id}</td>
                            <td className="px-3 py-2">{inv.status}</td>
                            <td className="px-3 py-2">${Number(inv.total || 0).toFixed(2)}</td>
                            <td className="px-3 py-2">{inv.created ? new Date(inv.created).toLocaleString() : ''}</td>
                            <td className="px-3 py-2 text-right">
                              <a className="btn-glass btn-xs btn-outline" href={inv.hostedInvoiceUrl} target="_blank">
                                Open
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-white/70 text-sm">No invoices.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
