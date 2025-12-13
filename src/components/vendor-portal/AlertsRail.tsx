import React, { useEffect, useState } from 'react';

type Notification = {
  _id: string;
  type?: string;
  title?: string;
  message?: string;
  link?: string;
  read?: boolean;
  createdAt?: string;
};

const typeEmoji: Record<string, string> = {
  order: '📦',
  invoice: '🧾',
  payment: '💳',
  message: '💬',
  alert: '⚠️',
  default: '🔔'
};

const AlertsRail: React.FC = () => {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/vendor/notifications', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to load alerts');
      const list = Array.isArray(data.notifications) ? data.notifications : [];
      setItems(list.slice(0, 5));
    } catch (err: any) {
      setError(err?.message || 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-white/60 font-semibold">Alerts</p>
          <h3 className="text-lg font-bold text-white">Notifications rail</h3>
        </div>
        <a
          href="/vendor-portal/notifications"
          className="text-sm text-primary hover:text-primary/80 font-semibold"
        >
          View all
        </a>
      </div>

      {loading && <p className="text-white/70 text-sm">Loading alerts...</p>}
      {error && <p className="text-amber-300 text-sm">{error}</p>}

      {!loading && !error && (
        <div className="space-y-2">
          {items.length === 0 && <p className="text-white/60 text-sm">No recent alerts.</p>}
          {items.map((n) => {
            const icon = typeEmoji[n.type || ''] || typeEmoji.default;
            const timestamp = n.createdAt ? new Date(n.createdAt).toLocaleString() : '';
            return (
              <div
                key={n._id}
                className={`rounded-lg border border-white/10 bg-dark/40 px-3 py-2 flex items-start gap-3 ${
                  n.read ? 'opacity-75' : ''
                }`}
              >
                <span className="text-lg">{icon}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-white leading-tight">
                      {n.title || 'Notification'}
                    </p>
                    {timestamp && (
                      <span className="text-[10px] text-white/50 whitespace-nowrap">
                        {timestamp}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/70 mt-1 leading-snug">{n.message || ''}</p>
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    {n.link && (
                      <a href={n.link} className="text-primary font-semibold hover:text-primary/80">
                        Open →
                      </a>
                    )}
                    {!n.read && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 text-primary px-2 py-0.5 font-semibold">
                        ● New
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AlertsRail;
