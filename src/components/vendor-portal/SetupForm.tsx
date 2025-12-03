import React, { useMemo, useState } from 'react';

interface SetupFormProps {
  vendorId: string;
  email: string;
  companyName: string;
  token: string;
}

type Strength = 'weak' | 'medium' | 'strong';

function getStrength(password: string): Strength {
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const longEnough = password.length >= 12;
  if (password.length < 8) return 'weak';
  const score = [hasUpper, hasLower, hasNumber, hasSymbol, longEnough].filter(Boolean).length;
  if (score >= 4) return 'strong';
  if (score >= 3) return 'medium';
  return 'weak';
}

export default function SetupForm({ email, companyName, token, vendorId }: SetupFormProps) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const strength = useMemo(() => getStrength(password), [password]);
  const passwordsMatch = password === confirm;
  const passwordValid = password.length >= 8 && passwordsMatch;

  const strengthLabel =
    strength === 'strong' ? 'Strong' : strength === 'medium' ? 'Medium' : 'Weak';
  const strengthColor =
    strength === 'strong'
      ? 'text-green-400'
      : strength === 'medium'
      ? 'text-yellow-300'
      : 'text-red-400';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!passwordValid) {
      setError('Password must be at least 8 characters and match confirmation.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/vendor/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, password, vendorId })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) {
        window.location.href = '/vendor-portal/login?setup=success';
      } else {
        setError(data?.message || 'Setup failed. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div>
        <p className="text-xs uppercase tracking-wide text-primary font-semibold mb-1">Welcome</p>
        <h2 className="text-2xl font-semibold text-white">{companyName}</h2>
        <p className="text-sm text-white/60">Complete your vendor portal account setup.</p>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-white">Email</label>
        <input
          type="email"
          value={email}
          disabled
          className="w-full rounded-md border border-white/20 bg-zinc-900/80 px-3 py-2 text-white"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-white">Create Password</label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
            className="w-full rounded-md border border-white/20 bg-zinc-900/80 px-3 py-2 text-white pr-10"
            aria-describedby="password-help"
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute inset-y-0 right-3 text-white/70 text-sm"
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
        <div className="flex items-center justify-between text-xs text-white/60" id="password-help">
          <span>At least 8 characters</span>
          <span className={`${strengthColor} font-semibold`}>{strengthLabel}</span>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-white">Confirm Password</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          className="w-full rounded-md border border-white/20 bg-zinc-900/80 px-3 py-2 text-white"
        />
        {confirm && !passwordsMatch && (
          <p className="text-xs text-red-400">Passwords do not match.</p>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!passwordValid || loading}
        className="w-full rounded-md bg-primary px-4 py-2 font-semibold uppercase tracking-wide text-white hover:bg-primary/80 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Setting up...' : 'Complete Setup'}
      </button>
      <p className="text-xs text-center text-white/60">
        Password is securely stored and can be changed later in Settings.
      </p>
    </form>
  );
}
