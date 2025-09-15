import { getAuth0Client } from '@/lib/auth';

async function initHeaderAuth() {
  const badge = document.getElementById('account-top-badge');
  if (!badge) return;
  try {
    const auth0 = await getAuth0Client();
    const authed = await auth0.isAuthenticated();
    if (!authed) {
      badge.innerHTML = `<a href="/account" class="hover:!text-accent hover:underline">Log in / Sign up</a>`;
      return;
    }
    const user = await auth0.getUser();
    const name =
      (user as any)?.given_name || (user as any)?.name || (user as any)?.email || 'there';
    badge.innerHTML = `<span class="text-white/80">Welcome, ${name}</span>`;
  } catch (err) {
    console.warn('[header-auth] failed to initialize Auth0', err);
  }
}

initHeaderAuth();
