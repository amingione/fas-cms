'use client';

import { useEffect } from 'react';

export default function HeaderAuth() {
  useEffect(() => {
    const run = async () => {
      const badge = document.getElementById('account-top-badge');
      if (!badge) return;
      try {
        const fas = (window as any).fasAuth;
        const authed = fas ? await fas.isAuthenticated() : false;
        if (!authed) {
          badge.innerHTML = `<a href="/account" class="hover:!text-accent hover:underline">Sign in</a>`;
          return;
        }
        const session = fas ? await fas.getSession() : null;
        const name = session?.user?.name || session?.user?.email || 'there';
        badge.innerHTML = `
          <span class="hidden sm:inline mr-3">Hello, ${name}</span>
          <a href="/dashboard" class="hover:!text-accent hover:underline">My Account</a>
        `;
      } catch (e) {
        badge.innerHTML = `<a href="/account" class="hover:!text-accent hover:underline">Sign in</a>`;
      }
    };
    run();
  }, []);

  return null;
}
