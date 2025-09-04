import { useEffect } from 'react';
import { getAuth0Client } from '@/lib/auth';

export default function HeaderAuth() {
  useEffect(() => {
    const run = async () => {
      const badge = document.getElementById('account-top-badge');
      if (!badge) return;
      // Respect a custom profile toggle already rendered in the top bar
      const hasCustomProfile = document.getElementById('accountDashboardToggleTop');
      if (hasCustomProfile) return;
      try {
        const auth0 = await getAuth0Client();
        const authed = await auth0.isAuthenticated();
        if (!authed) {
          badge.innerHTML = `<a href="/account" class="hover:!text-black hover:underline">Log in / Sign up</a>`;
          return;
        }
        const user = await auth0.getUser();
        const name = (user as any)?.given_name || (user as any)?.name || (user as any)?.email || 'there';
        badge.innerHTML = `
          <span class="mr-3">Hello, ${name}</span>
          <a href="/dashboard" class="hover:!text-black hover:underline">My Account</a>
        `;
      } catch (e) {
        // Fallback link
        badge.innerHTML = `<a href="/account" class="hover:!text-black hover:underline">My Account</a>`;
      }
    };
    run();
  }, []);

  return null;
}
