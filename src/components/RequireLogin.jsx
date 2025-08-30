// src/components/RequireLogin.jsx
import { useEffect, useState } from 'react';
import { getAuth0Client } from '@/lib/auth';

export default function RequireLogin({ children = null }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const auth0 = await getAuth0Client();
        const authed = await auth0.isAuthenticated();
        if (!authed) {
          // Either hard redirect to /account...
          window.location.replace('/account');
          // ...or start an Auth0 login flow instead:
          // await auth0.loginWithRedirect({
          //   authorizationParams: { redirect_uri: window.location.origin + '/account', screen_hint: 'login' },
          // });
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
