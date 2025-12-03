import React, { useEffect, useState } from 'react';

type VendorProfile = {
  _id: string;
  name?: string;
  email?: string;
  portalAccess?: { email?: string };
  notificationPreferences?: Record<string, boolean>;
  shippingAddresses?: Array<{
    label?: string;
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    default?: boolean;
  }>;
};

const SettingsPanel: React.FC = () => {
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/vendor/me', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to load profile');
      setProfile(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/vendor/settings/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: profile.name,
          email: profile.email,
          portalEmail: profile.portalAccess?.email
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Failed to save settings');
    } catch (err: any) {
      setError(err?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <p className="text-white/80">Loading settings...</p>;
  if (error) return <p className="text-red-400">{error}</p>;
  if (!profile) return <p className="text-white/70">No profile found.</p>;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h2 className="text-lg font-semibold text-white mb-3">Company Profile</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-white/80">
            Name
            <input
              value={profile.name || ''}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              className="w-full mt-1 bg-zinc-900 border border-white/20 text-white rounded px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm text-white/80">
            Portal Email
            <input
              value={profile.portalAccess?.email || ''}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  portalAccess: { ...(profile.portalAccess || {}), email: e.target.value }
                })
              }
              className="w-full mt-1 bg-zinc-900 border border-white/20 text-white rounded px-3 py-2 text-sm"
            />
          </label>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={save}
            className="bg-primary text-white rounded px-4 py-2 text-sm disabled:opacity-50"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button onClick={load} className="text-white/70 text-sm">
            Reset
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h2 className="text-lg font-semibold text-white mb-3">Notification Preferences</h2>
        <p className="text-white/60 text-sm">Toggles are illustrative; wire to API as needed.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {['orders', 'messages', 'invoices', 'payments'].map((key) => (
            <label key={key} className="flex items-center gap-2 text-sm text-white/80">
              <input type="checkbox" className="h-4 w-4" defaultChecked />
              <span>Notify for {key}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
