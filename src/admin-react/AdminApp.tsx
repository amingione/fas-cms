import React, { useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
// We import your existing dashboard App without modifying it.
// Adjust the relative path below to wherever you placed the repo's App.tsx inside src/admin-react.
import App from './App';

/**
 * AdminApp wraps your existing App with a basename so all routes live under /admin
 * without changing your App.tsx routing or your existing APIs.
 */
export default function AdminApp() {
  function Guard({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<'checking' | 'ok' | 'forbidden'>('checking');
    useEffect(() => {
      let alive = true;
      (async () => {
        // Wait a bit for auth bootstrap
        for (let i = 0; i < 10 && alive; i++) {
          if (typeof (window as any).fasAuth !== 'undefined') break;
          await new Promise((r) => setTimeout(r, 100));
        }
        const fx: any = (window as any).fasAuth;
        if (!fx) {
          setState('forbidden');
          return;
        }
        try {
          const authed = await fx.isAuthenticated();
          if (!authed) {
            await fx.loginTo('/admin');
            return;
          }
          const ok = await fx.hasRole?.(['employee', 'owner']);
          setState(ok ? 'ok' : 'forbidden');
        } catch {
          setState('forbidden');
        }
      })();
      return () => {
        alive = false;
      };
    }, []);
    if (state === 'checking') return (
      <main className="p-8 text-center text-white/70">Loading admin…</main>
    );
    if (state === 'forbidden')
      return (
        <main className="p-8 text-center text-red-400">
          Forbidden: employee or owner role required.
          <div className="mt-4">
            <button
              className="rounded bg-red-600 px-3 py-1.5 text-white"
              onClick={() => (window as any).fasAuth?.logout?.(location.origin + '/account')}
            >
              Logout & Re-login
            </button>
          </div>
        </main>
      );
    return <>{children}</>;
  }
  return (
    <HelmetProvider>
      <BrowserRouter basename="/admin">
        <Guard>
          <App />
        </Guard>
      </BrowserRouter>
    </HelmetProvider>
  );
}
