'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';

function getCookie(name: string) {
  const match = document.cookie.match(
    new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)')
  );
  return match ? decodeURIComponent(match[1]) : undefined;
}

function setConsentCookie() {
  const oneYear = 60 * 60 * 24 * 365;
  const base = `cookie-consent=1; max-age=${oneYear}; path=/; SameSite=Lax`;
  const secure =
    typeof window !== 'undefined' && window.location?.protocol === 'https:' ? '; Secure' : '';
  document.cookie = base + secure;
}

export function CookieBanner() {
  useEffect(() => {
    if (getCookie('cookie-consent') === '1') return;

    // ensure any prior instance is cleared (dev strict-mode safety)
    try {
      toast.dismiss('cookie-consent-toast');
    } catch {}

    const toastId = toast(
      <>
        🍪 We use cookies to improve your experience. By using our site, you accept cookies.
        <button
          onClick={() => {
            setConsentCookie();
            toast.dismiss('cookie-consent-toast');
          }}
          style={{
            marginLeft: '10px',
            padding: '4px 8px',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Got it
        </button>
      </>,
      {
        id: 'cookie-consent-toast',
        duration: Infinity
      }
    );
  }, []);

  return null;
}
