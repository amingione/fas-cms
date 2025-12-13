import { useEffect, useMemo, useState } from 'react';
import { BellIcon } from '@heroicons/react/24/outline';

type Notification = {
  _id: string;
  title?: string;
  message?: string;
  link?: string;
  read?: boolean;
  createdAt?: string;
};

export default function AlertsBell() {
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState<number>(0);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const [countRes, listRes] = await Promise.all([
        fetch('/api/vendor/notifications/unread-count', { credentials: 'include' }),
        fetch('/api/vendor/notifications', { credentials: 'include' })
      ]);
      const countData = await countRes.json();
      const listData = await listRes.json();
      if (!countRes.ok) throw new Error(countData?.message || 'Failed to load alerts');
      if (!listRes.ok) throw new Error(listData?.message || 'Failed to load alerts');
      setUnread(typeof countData.unread === 'number' ? countData.unread : 0);
      const list = Array.isArray(listData.notifications) ? listData.notifications : [];
      setItems(list);
    } catch (err: any) {
      setError(err?.message || '!');
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  const badge = unread > 9 ? '9+' : unread > 0 ? String(unread) : null;

  const tooltipText = useMemo(() => {
    if (error) return 'Alerts unavailable';
    if (unread > 0) return `${unread} unread notification${unread === 1 ? '' : 's'}`;
    return 'No new notifications';
  }, [unread, error]);

  return (
    <div className="relative group">
      <button
        type="button"
        className="relative inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 p-2 text-white hover:border-primary hover:bg-white/10 transition"
        aria-label="Open notifications"
        onClick={() => setOpen((v) => !v)}
      >
        <BellIcon className="h-5 w-5" aria-hidden="true" />
        {(badge || error) && (
          <span className="absolute -top-1 -right-1 rounded-full bg-primary px-1.5 text-[10px] font-semibold text-white shadow-lg">
            {error || badge}
          </span>
        )}
      </button>

      <div className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-dark px-2 py-1 text-[10px] font-semibold text-white/80 opacity-0 transition group-hover:opacity-100">
        {tooltipText}
      </div>

      {open && (
        <div className="absolute right-0 mt-2 w-96 max-w-[90vw] rounded-2xl border border-white/10 bg-dark/90 shadow-2xl ring-1 ring-white/10 z-30">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-white/60 font-semibold">
                Alerts
              </p>
              <p className="text-sm font-semibold text-white">Recent notifications</p>
            </div>
            <a
              href="/vendor-portal/notifications"
              className="text-xs text-primary font-semibold hover:text-primary/80"
            >
              View all
            </a>
          </div>
          <div className="max-h-80 overflow-auto divide-y divide-white/10">
            {items.length === 0 && (
              <p className="text-white/60 text-sm p-4">No notifications yet.</p>
            )}
            {items.map((n) => (
              <div key={n._id} className={`p-4 ${n.read ? 'opacity-80' : ''}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-white">{n.title || 'Notification'}</p>
                  {n.createdAt && (
                    <span className="text-[10px] text-white/50 whitespace-nowrap">
                      {new Date(n.createdAt).toLocaleString()}
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/70 mt-1 leading-snug">{n.message || ''}</p>
                {n.link && (
                  <a
                    href={n.link}
                    className="text-primary text-xs font-semibold hover:text-primary/80 inline-flex items-center gap-1 mt-2"
                  >
                    Open →
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
