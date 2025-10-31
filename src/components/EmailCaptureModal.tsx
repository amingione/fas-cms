import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

const STORAGE_KEY = 'fas-email-popup-dismissed-at';
const SUPPRESSION_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const SCROLL_THRESHOLD = 250;
const DELAY_AFTER_SCROLL_MS = 10_000;
const FALLBACK_DELAY_MS = 25_000;

type SubmissionState = 'idle' | 'submitting' | 'success' | 'error';

type SuppressionRecord = {
  dismissedAt: number;
};

function getSuppressionRecord(): SuppressionRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.dismissedAt === 'number') {
      return parsed;
    }
  } catch (error) {
    console.warn('Failed to read email popup suppression record', error);
  }
  return null;
}

function shouldSuppress(record: SuppressionRecord | null): boolean {
  if (!record) return false;
  return Date.now() - record.dismissedAt < SUPPRESSION_MS;
}

function setSuppression() {
  if (typeof window === 'undefined') return;
  try {
    const payload: SuppressionRecord = { dismissedAt: Date.now() };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('Failed to persist email popup suppression record', error);
  }
}

const emailPattern = /[^\s@]+@[^\s@]+\.[^\s@]+/;

export default function EmailCaptureModal() {
  const [visible, setVisible] = useState(false);
  const [isEligible, setIsEligible] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submissionState, setSubmissionState] = useState<SubmissionState>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const record = getSuppressionRecord();
    if (shouldSuppress(record)) {
      setIsEligible(false);
      return;
    }
    if (record) {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        console.warn('Failed to clear expired email popup suppression record', error);
      }
    }
    setIsEligible(true);
  }, []);

  useEffect(() => {
    if (!isEligible || typeof window === 'undefined') return;

    let showTimeout: number | undefined;
    let fallbackTimeout: number | undefined;
    let hasOpened = false;

    const openPopup = () => {
      if (hasOpened) return;
      hasOpened = true;
      if (showTimeout != null) {
        window.clearTimeout(showTimeout);
        showTimeout = undefined;
      }
      if (fallbackTimeout != null) {
        window.clearTimeout(fallbackTimeout);
        fallbackTimeout = undefined;
      }
      setVisible(true);
    };

    const startShowTimer = () => {
      if (showTimeout != null || hasOpened) return;
      showTimeout = window.setTimeout(openPopup, DELAY_AFTER_SCROLL_MS);
    };

    const handleScroll = () => {
      if (window.scrollY > SCROLL_THRESHOLD) {
        startShowTimer();
      }
    };

    const handleInteraction = () => {
      startShowTimer();
    };

    fallbackTimeout = window.setTimeout(openPopup, FALLBACK_DELAY_MS);

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('pointerdown', handleInteraction, { passive: true });
    window.addEventListener('keydown', handleInteraction);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('pointerdown', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      if (showTimeout != null) {
        window.clearTimeout(showTimeout);
      }
      if (fallbackTimeout != null) {
        window.clearTimeout(fallbackTimeout);
      }
    };
  }, [isEligible]);

  useEffect(() => {
    if (!visible || typeof window === 'undefined') return;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        dismiss();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [visible]);

  const dismiss = () => {
    setVisible(false);
    setSubmissionState('idle');
    setErrorMessage('');
    setSuppression();
  };

  const hasError = submissionState === 'error' && errorMessage;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submissionState === 'submitting') return;

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setSubmissionState('error');
      setErrorMessage('Please enter your name.');
      return;
    }

    if (!emailPattern.test(trimmedEmail)) {
      setSubmissionState('error');
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setSubmissionState('submitting');
    setErrorMessage('');

    const pageUrl = typeof window !== 'undefined' ? window.location.href : '';

    const payload = {
      formName: 'Marketing Newsletter Signup',
      fields: {
        name: trimmedName,
        email: trimmedEmail,
        source: 'Homepage Scroll Popup',
        ...(pageUrl ? { pageUrl } : {})
      },
      marketingOptIn: {
        source: 'Homepage Scroll Popup',
        tags: ['homepage', 'modal', 'email-capture']
      }
    } as const;

    try {
      const response = await fetch('/api/form-submission', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      setSubmissionState('success');
      setSuppression();
      window.setTimeout(() => setVisible(false), 3_000);
    } catch (error) {
      console.error('Newsletter signup failed', error);
      setSubmissionState('error');
      setErrorMessage('Something went wrong. Please try again in a moment.');
    }
  };

  const headline = useMemo(() => {
    if (submissionState === 'success') {
      return 'You\'re all set!';
    }
    return 'Unlock exclusive offers & updates';
  }, [submissionState]);

  if (!visible) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="email-popup-heading"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-3 top-3 rounded-full bg-gray-100 p-1.5 text-gray-500 transition hover:bg-gray-200 hover:text-gray-700"
          aria-label="Close email sign up popup"
        >
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>

        <div className="grid gap-6 p-6 sm:p-8">
          <div className="space-y-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Join the crew</p>
            <h2 id="email-popup-heading" className="text-2xl font-bold text-gray-900 sm:text-3xl">
              {headline}
            </h2>
            {submissionState !== 'success' ? (
              <p className="text-sm text-gray-600">
                Subscribe to get VIP-only promos, build guides, and launch alerts before anyone else.
              </p>
            ) : (
              <p className="text-sm text-gray-600">
                Thanks for subscribing! Look out for the next drop in your inbox.
              </p>
            )}
          </div>

          {submissionState !== 'success' ? (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-1">
                <label htmlFor="email-popup-name" className="text-sm font-medium text-gray-800">
                  Name <span aria-hidden="true" className="text-red-500">*</span>
                  <span className="sr-only">required</span>
                </label>
                <input
                  id="email-popup-name"
                  type="text"
                  value={name}
                  autoComplete="name"
                  required
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="Your name"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="email-popup-email" className="text-sm font-medium text-gray-800">
                  Email <span aria-hidden="true" className="text-red-500">*</span>
                  <span className="sr-only">required</span>
                </label>
                <input
                  id="email-popup-email"
                  type="email"
                  required
                  value={email}
                  autoComplete="email"
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="you@example.com"
                />
              </div>

              {hasError ? (
                <p className="text-sm text-red-600">{errorMessage}</p>
              ) : null}

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:bg-gray-300"
                disabled={submissionState === 'submitting'}
              >
                {submissionState === 'submitting' ? 'Joining…' : 'Sign me up'}
              </button>

              <button
                type="button"
                onClick={dismiss}
                className="mx-auto block text-xs font-medium uppercase tracking-[0.3em] text-gray-400 transition hover:text-gray-600"
              >
                No thanks
              </button>
            </form>
          ) : (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <svg className="h-6 w-6" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 10.75L8.25 15 16 6" />
                </svg>
              </div>
              <p className="text-sm text-gray-600">
                You\'ll hear from us soon. Feel free to keep exploring the build gallery while you wait.
              </p>
              <button
                type="button"
                onClick={dismiss}
                className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-300 hover:text-gray-900"
              >
                Continue browsing
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
