// src/components/RequireLogin.jsx
import { useEffect, useState } from 'react';

export default function RequireLogin({ children = null }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const fas = window.fasAuth;
        const authed = fas ? await fas.isAuthenticated() : false;
        if (!authed) {
          // Either hard redirect to /account...
          window.location.replace('/account');
          return;
        }
        if (mounted) setReady(true);
      } catch (e) {
        console.error('RequireLogin init failed:', e);
        window.location.replace('/account');
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Render nothing until auth check completes (prevents child from flashing)
  if (!ready) return null;
  return children;
}
