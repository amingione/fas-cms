import React, { useEffect, useMemo, useState } from 'react';

type VendorProfile = {
  _id: string;
  name?: string;
  email?: string;
  portalAccess?: { email?: string };
};

type VendorAddress = {
  label?: string;
  street?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  isDefault?: boolean;
};

type NotificationPrefs = {
  emailOrders?: boolean;
  emailInvoices?: boolean;
  emailMessages?: boolean;
  emailPayments?: boolean;
};

const defaultPrefs: NotificationPrefs = {
  emailOrders: true,
  emailInvoices: true,
  emailMessages: true,
  emailPayments: true
};

const SettingsPanel: React.FC = () => {
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [addresses, setAddresses] = useState<VendorAddress[]>([]);
  const [preferences, setPreferences] = useState<NotificationPrefs>(defaultPrefs);
  const [activeTab, setActiveTab] = useState<
    'profile' | 'addresses' | 'notifications' | 'security'
  >('profile');
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [addressDraft, setAddressDraft] = useState<VendorAddress>({});

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirm: ''
  });
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const inputBaseClass =
    'w-full rounded border border-white/20 !bg-[#1a1a1a] !text-white placeholder:text-white/50 px-3 py-2 text-sm';

  const loadProfile = async () => {
    const res = await fetch('/api/vendor/settings/profile', { credentials: 'include' });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Failed to load profile');
    setProfile(data);
  };

  const loadAddresses = async () => {
    const res = await fetch('/api/vendor/settings/addresses', { credentials: 'include' });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Failed to load addresses');
    const normalized = Array.isArray(data.addresses)
      ? data.addresses.map((addr: any) => ({
          label: addr.label,
          street: addr.street || addr.line1 || '',
          address2: addr.address2 || addr.line2 || '',
          city: addr.city || '',
          state: addr.state || '',
          zip: addr.zip || addr.postalCode || '',
          country: addr.country || '',
          isDefault: Boolean(addr.isDefault ?? addr.default)
        }))
      : [];
    setAddresses(normalized);
    return normalized;
  };

  const loadPreferences = async () => {
    const res = await fetch('/api/vendor/settings/notifications', { credentials: 'include' });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Failed to load notification preferences');
    setPreferences({ ...defaultPrefs, ...(data.preferences || {}) });
  };

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadProfile(), loadAddresses(), loadPreferences()]);
    } catch (err: any) {
      setError(err?.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const saveProfile = async () => {
    if (!profile) return;
    setSavingProfile(true);
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
      if (!res.ok) throw new Error(data?.message || 'Failed to save profile');
    } catch (err: any) {
      setError(err?.message || 'Failed to save profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const openAddressForm = (index: number | null) => {
    setEditingIndex(index);
    setShowAddressForm(true);
    if (index === null) {
      setAddressDraft({});
    } else {
      setAddressDraft(addresses[index] || {});
    }
  };

  const saveAddress = async () => {
    setError(null);
    try {
      const payload = { ...addressDraft };
      if (editingIndex === null) {
        const res = await fetch('/api/vendor/settings/addresses', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.message || 'Failed to add address');
      } else {
        const res = await fetch('/api/vendor/settings/addresses', {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ index: editingIndex, address: payload })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.message || 'Failed to update address');
      }
      const refreshed = await loadAddresses();
      if (payload.isDefault && Array.isArray(refreshed)) {
        const defaultIndex = refreshed.findIndex((addr) => addr.isDefault);
        if (defaultIndex >= 0) {
          await setDefaultAddress(defaultIndex, refreshed);
        }
      }
      setShowAddressForm(false);
      setEditingIndex(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to save address');
    }
  };

  const deleteAddress = async (index: number) => {
    setError(null);
    try {
      const res = await fetch('/api/vendor/settings/addresses', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Failed to delete address');
      await loadAddresses();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete address');
    }
  };

  const setDefaultAddress = async (index: number, source: VendorAddress[] = addresses) => {
    setError(null);
    try {
      const next = source.map((addr, i) => ({
        ...addr,
        isDefault: i === index
      }));
      for (let i = 0; i < next.length; i++) {
        await fetch('/api/vendor/settings/addresses', {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ index: i, address: next[i] })
        });
      }
      await loadAddresses();
    } catch (err: any) {
      setError(err?.message || 'Failed to update default address');
    }
  };

  const togglePreference = async (key: keyof NotificationPrefs, value: boolean) => {
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    setSavingPrefs(true);
    setError(null);
    try {
      const res = await fetch('/api/vendor/settings/notifications', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Failed to update preferences');
    } catch (err: any) {
      setError(err?.message || 'Failed to update preferences');
    } finally {
      setSavingPrefs(false);
    }
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);
    setError(null);
    if (passwordForm.newPassword !== passwordForm.confirm) {
      setError('New passwords do not match');
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch('/api/vendor/settings/password', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Failed to update password');
      setPasswordMessage('Password updated successfully.');
      setPasswordForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err: any) {
      setError(err?.message || 'Failed to update password');
    } finally {
      setSavingPassword(false);
    }
  };

  const tabButton = (key: typeof activeTab, label: string) => (
    <button
      key={key}
      onClick={() => setActiveTab(key)}
      className={`rounded-lg px-3 py-2 text-sm font-medium border shadow-white/10 shadow-box-outter shadow-inner ${
        activeTab === key
          ? 'bg-primary text-white border-primary'
          : 'bg-white/5 text-white/80 border-white/10 hover:border-white/30'
      }`}
    >
      {label}
    </button>
  );

  const addressList = useMemo(() => {
    if (!addresses.length) return <p className="text-white/70 text-sm">No addresses added yet.</p>;
    return (
      <div className="space-y-3">
        {addresses.map((addr, idx) => (
          <div
            key={`${addr.label || 'addr'}-${idx}`}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 p-3"
          >
            <div className="text-white/80 text-sm">
              <div className="font-semibold text-white">{addr.label || 'Address'}</div>
              <div>{addr.street}</div>
              {addr.address2 && <div>{addr.address2}</div>}
              <div>
                {[addr.city, addr.state, addr.zip].filter(Boolean).join(', ')} {addr.country}
              </div>
              {addr.isDefault && (
                <span className="text-green-400 text-xs font-semibold">Default</span>
              )}
            </div>
            <div className="flex gap-2 text-xs">
              {!addr.isDefault && (
                <button
                  onClick={() => setDefaultAddress(idx)}
                  className="rounded border border-white/20 px-2 py-1 text-white/80 hover:border-primary"
                >
                  Set Default
                </button>
              )}
              <button
                onClick={() => openAddressForm(idx)}
                className="rounded border border-white/20 px-2 py-1 text-white/80 hover:border-primary"
              >
                Edit
              </button>
              <button
                onClick={() => deleteAddress(idx)}
                className="rounded border border-red-500/60 px-2 py-1 text-red-300 hover:border-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }, [addresses]);

  if (loading) return <p className="text-white/80">Loading settings...</p>;
  if (error) return <p className="text-red-400">{error}</p>;
  if (!profile) return <p className="text-white/70">No profile found.</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        {tabButton('profile', 'Company Profile')}
        {tabButton('addresses', 'Shipping Addresses')}
        {tabButton('notifications', 'Notifications')}
        {tabButton('security', 'Security')}
      </div>

      {activeTab === 'profile' && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-4">
          <h2 className="text-lg font-semibold text-white">Company Profile</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-white/80">
              Name
              <input
                value={profile.name || ''}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className={`${inputBaseClass} mt-1`}
              />
            </label>
            <label className="text-sm text-white/80">
              Account Email
              <input
                value={profile.email || ''}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className={`${inputBaseClass} mt-1`}
              />
            </label>
            <label className="text-sm text-white/80">
              Portal Login Email
              <input
                value={profile.portalAccess?.email || ''}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    portalAccess: { ...(profile.portalAccess || {}), email: e.target.value }
                  })
                }
                className={`${inputBaseClass} mt-1`}
              />
            </label>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={saveProfile}
              className="bg-primary text-white rounded px-4 py-2 text-sm disabled:opacity-50"
              disabled={savingProfile}
            >
              {savingProfile ? 'Saving...' : 'Save'}
            </button>
            <button onClick={loadAll} className="text-white/70 text-sm">
              Reset
            </button>
          </div>
        </div>
      )}

      {activeTab === 'addresses' && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Shipping Addresses</h2>
            <button
              onClick={() => openAddressForm(null)}
              className="bg-primary text-white rounded px-3 py-2 text-sm"
            >
              Add Address
            </button>
          </div>
          {addressList}
          {showAddressForm && (
            <div className="rounded-lg border border-white/10 bg-[#1a1a1a] p-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  placeholder="Label (e.g. Warehouse)"
                  value={addressDraft.label || ''}
                  onChange={(e) => setAddressDraft({ ...addressDraft, label: e.target.value })}
                  className={inputBaseClass}
                />
                <input
                  placeholder="Country"
                  value={addressDraft.country || ''}
                  onChange={(e) => setAddressDraft({ ...addressDraft, country: e.target.value })}
                  className={inputBaseClass}
                />
                <input
                  placeholder="Street"
                  value={addressDraft.street || ''}
                  onChange={(e) => setAddressDraft({ ...addressDraft, street: e.target.value })}
                  className={inputBaseClass}
                />
                <input
                  placeholder="Address line 2"
                  value={addressDraft.address2 || ''}
                  onChange={(e) => setAddressDraft({ ...addressDraft, address2: e.target.value })}
                  className={inputBaseClass}
                />
                <input
                  placeholder="City"
                  value={addressDraft.city || ''}
                  onChange={(e) => setAddressDraft({ ...addressDraft, city: e.target.value })}
                  className={inputBaseClass}
                />
                <input
                  placeholder="State/Province"
                  value={addressDraft.state || ''}
                  onChange={(e) => setAddressDraft({ ...addressDraft, state: e.target.value })}
                  className={inputBaseClass}
                />
                <input
                  placeholder="Postal Code"
                  value={addressDraft.zip || ''}
                  onChange={(e) => setAddressDraft({ ...addressDraft, zip: e.target.value })}
                  className={inputBaseClass}
                />
                <label className="flex items-center gap-2 text-sm text-white/80">
                  <input
                    type="checkbox"
                    checked={Boolean(addressDraft.isDefault)}
                    onChange={(e) =>
                      setAddressDraft({ ...addressDraft, isDefault: e.target.checked })
                    }
                    className="h-4 w-4"
                  />
                  Set as default
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={saveAddress}
                  className="bg-primary text-white rounded px-4 py-2 text-sm"
                >
                  Save Address
                </button>
                <button
                  onClick={() => {
                    setShowAddressForm(false);
                    setEditingIndex(null);
                  }}
                  className="text-white/70 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-4">
          <h2 className="text-lg font-semibold text-white">Notification Preferences</h2>
          <p className="text-sm text-white/60">Toggle the emails you want to receive.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { key: 'emailOrders', label: 'Order updates' },
              { key: 'emailInvoices', label: 'Invoice updates' },
              { key: 'emailMessages', label: 'Messages and replies' },
              { key: 'emailPayments', label: 'Payments and refunds' }
            ].map((item) => (
              <label key={item.key} className="flex items-center gap-2 text-sm text-white/80">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={Boolean(preferences[item.key as keyof NotificationPrefs])}
                  onChange={(e) =>
                    togglePreference(item.key as keyof NotificationPrefs, e.target.checked)
                  }
                  disabled={savingPrefs}
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
          {savingPrefs && <p className="text-white/70 text-sm">Saving preferences...</p>}
        </div>
      )}

      {activeTab === 'security' && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-4">
          <h2 className="text-lg font-semibold text-white">Security</h2>
          <form className="space-y-3" onSubmit={submitPassword}>
            <div className="grid gap-3 sm:grid-cols-3">
              <input
                type="password"
                placeholder="Current password"
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                }
                className={inputBaseClass}
                required
              />
              <input
                type="password"
                placeholder="New password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className={inputBaseClass}
                required
                minLength={8}
              />
              <input
                type="password"
                placeholder="Confirm new password"
                value={passwordForm.confirm}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                className={inputBaseClass}
                required
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-primary text-white rounded px-4 py-2 text-sm disabled:opacity-50"
                disabled={savingPassword}
              >
                {savingPassword ? 'Saving...' : 'Update Password'}
              </button>
              <button
                type="button"
                onClick={() =>
                  setPasswordForm({ currentPassword: '', newPassword: '', confirm: '' })
                }
                className="text-white/70 text-sm"
              >
                Reset
              </button>
            </div>
            {passwordMessage && <p className="text-green-400 text-sm">{passwordMessage}</p>}
          </form>
          <div className="border-t border-white/10 pt-3 text-white/70 text-sm">
            Two-factor authentication is coming soon. In the meantime, use a strong, unique
            password.
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPanel;
