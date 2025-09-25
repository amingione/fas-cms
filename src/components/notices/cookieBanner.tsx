'use client';

import { useEffect, useState } from 'react';

function getCookie(name: string) {
  const match = document.cookie.match(
    new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)')
  );
  return match ? decodeURIComponent(match[1]) : undefined;
}

function setConsentCookie() {
  const oneYear = 60 * 60 * 24 * 365;
  const secure =
    typeof window !== 'undefined' && window.location?.protocol === 'https:' ? '; Secure' : '';
  let domainAttr = '';
  try {
    const host = window.location.hostname || '';
    if (
      /\.fasmotorsports\.com$/i.test(host) ||
      host === 'fasmotorsports.com' ||
      host === 'www.fasmotorsports.com'
    ) {
      domainAttr = '; Domain=.fasmotorsports.com';
    }
  } catch {}
  document.cookie = `cookie-consent=1; max-age=${oneYear}; path=/; SameSite=Lax${secure}${domainAttr}`;
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (getCookie('cookie-consent') !== '1') setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-[2000] px-3 sm:px-4 pb-3 sm:pb-4"
    >
      <div className="mx-auto max-w-5xl rounded-lg border border-white/15 bg-black/85 backdrop-blur-md p-3 sm:p-4 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <p className="text-sm leading-snug grow">
            We use cookies to improve your experience. By using our site, you accept cookies.
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <a
              href="/privacypolicy"
              className="text-xs underline opacity-80 hover:opacity-100"
              target="_self"
            >
              Learn more
            </a>
            <button
              onClick={() => {
                setConsentCookie();
                setVisible(false);
              }}
              className="ml-auto sm:ml-0 inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
