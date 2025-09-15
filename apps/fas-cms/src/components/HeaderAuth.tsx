import { useEffect } from 'react';
import { getAuth0Client } from '@/lib/auth';

export default function HeaderAuth() {
  useEffect(() => {
    const run = async () => {
      const badge = document.getElementById('account-top-badge');
      if (!badge) return;
      try {
        const auth0 = await getAuth0Client();
        const authed = await auth0.isAuthenticated();
        if (!authed) {
          // Use serverless login to avoid client bundling issues; callback sets cookie + redirects
          badge.innerHTML = `<a href="/.netlify/functions/auth-login" class="hover:!text-accent hover:underline">Sign in</a>`;
          return;
        }
        const user = await auth0.getUser();
        const name =
          (user as any)?.given_name || (user as any)?.name || (user as any)?.email || 'there';
        badge.innerHTML = `
          <span class="hidden sm:inline mr-3">Hello, ${name}</span>
          <a href="/dashboard" class="hover:!text-accent hover:underline">My Account</a>
        `;
      } catch (e) {
        // Fallback link
        badge.innerHTML = `<a href="/account" class="hover:!text-accent hover:underline">Sign in</a>`;
      }
    };
    run();
  }, []);

  return null;
}
