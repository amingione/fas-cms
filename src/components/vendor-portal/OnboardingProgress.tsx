import { useEffect, useState } from 'react';

type ProgressShape = {
  accountSetup: boolean;
  firstOrder: boolean;
  inventoryUpdate: boolean;
  invoiceUpload: boolean;
  messageSent: boolean;
};

type Props = {
  vendorId?: string;
  variant?: 'light' | 'dark';
};

const defaultProgress: ProgressShape = {
  accountSetup: false,
  firstOrder: false,
  inventoryUpdate: false,
  invoiceUpload: false,
  messageSent: false
};

export default function OnboardingProgress({ vendorId, variant = 'light' }: Props) {
  const [progress, setProgress] = useState<ProgressShape>(defaultProgress);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    try {
      const url = new URL('/api/vendor/onboarding/progress', window.location.origin);
      if (vendorId) url.searchParams.set('vendorId', vendorId);
      const res = await fetch(url.toString(), { credentials: 'include' });
      if (!res.ok) throw new Error('Request failed');
      const data = (await res.json()) as Partial<ProgressShape>;
      setProgress({
        ...defaultProgress,
        ...data
      });
      setError(null);
    } catch {
      setError('Unable to load progress right now.');
    }
  };

  const totalSteps = Object.keys(progress).length;
  const completedSteps = Object.values(progress).filter(Boolean).length;
  const percentage = Math.round((completedSteps / totalSteps) * 100);

  const isDark = variant === 'dark';

  const cardClass = isDark
    ? 'bg-black/60 border border-white/10 text-white'
    : 'bg-white border border-gray-200 text-gray-900';
  const labelMuted = isDark ? 'text-white/60' : 'text-gray-500';
  const textMuted = isDark ? 'text-white/70' : 'text-gray-600';
  const checkboxColor = isDark ? 'text-primary bg-black border-white/30' : 'text-primary';
  const progressBg = isDark ? 'bg-white/10' : 'bg-gray-100';

  return (
    <div className={`${cardClass} rounded-xl p-6 shadow-sm`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className={`text-xs uppercase tracking-[0.12em] font-semibold ${labelMuted}`}>
            Your Progress
          </p>
          <h3 className="text-lg font-bold">Onboarding checklist</h3>
        </div>
        <span className={`text-sm ${textMuted}`}>
          {completedSteps}/{totalSteps} complete
        </span>
      </div>

      <div className={`${progressBg} w-full rounded-full h-3 mb-4 overflow-hidden`}>
        <div
          className="bg-primary h-3 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
          aria-hidden="true"
        />
      </div>
      <p className={`text-xs mb-4 ${textMuted}`}>Stay on track to finish setup faster.</p>

      <ul className="space-y-3">
        {(
          [
            ['accountSetup', 'Complete account setup'],
            ['firstOrder', 'Submit your first order'],
            ['inventoryUpdate', 'Update inventory'],
            ['invoiceUpload', 'Upload an invoice'],
            ['messageSent', 'Send a message']
          ] as Array<[keyof ProgressShape, string]>
        ).map(([key, label]) => (
          <li key={key} className="flex items-center">
            <input
              type="checkbox"
              checked={progress[key]}
              readOnly
              className={`mr-3 h-5 w-5 ${checkboxColor} focus:ring-primary`}
            />
            <span className={progress[key] ? `${labelMuted} line-through` : ''}>{label}</span>
          </li>
        ))}
      </ul>

      {error && (
        <div
          className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
            isDark
              ? 'border-amber-400/40 bg-amber-400/10 text-amber-200'
              : 'border-amber-200 bg-amber-50 text-amber-700'
          }`}
        >
          {error}
        </div>
      )}

      {percentage === 100 && (
        <div
          className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
            isDark
              ? 'border-green-400/40 bg-green-400/10 text-green-200'
              : 'border-green-200 bg-green-50 text-green-700'
          }`}
        >
          🎉 You are fully onboarded! Explore analytics and keep your catalog fresh.
        </div>
      )}
    </div>
  );
}
