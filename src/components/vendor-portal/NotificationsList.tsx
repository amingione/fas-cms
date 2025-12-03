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

const NotificationsList: React.FC = () => {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/vendor/notifications', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to load notifications');
      setItems(data.notifications || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const markAllRead = async () => {
    try {
      await fetch('/api/vendor/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({})
      });
      load();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <p className="text-white/80">Loading notifications...</p>;
  if (error) return <p className="text-red-400">{error}</p>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Notifications</h1>
        <button onClick={markAllRead} className="text-sm text-primary underline">
          Mark all read
        </button>
      </div>
      <div className="rounded-lg border border-white/10 bg-white/5 divide-y divide-white/10">
        {items.length === 0 && <p className="text-white/70 p-4">No notifications.</p>}
        {items.map((n) => (
          <div key={n._id} className={`p-4 ${n.read ? 'opacity-70' : ''}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-semibold text-sm">{n.title || 'Notification'}</p>
                <p className="text-white/70 text-xs">{n.type || ''}</p>
              </div>
              <div className="text-xs text-white/60">
                {n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}
              </div>
            </div>
            <p className="text-white/80 text-sm mt-2">{n.message || ''}</p>
            {n.link && (
              <a href={n.link} className="text-primary text-sm underline mt-1 inline-block">
                View
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationsList;
