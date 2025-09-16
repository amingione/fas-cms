import { getFasAuthClient } from './fas-auth-client';

async function initHeaderAuth() {
  const badge = document.getElementById('account-top-badge');
  if (!badge) return;

  const fas = await getFasAuthClient();
  if (!fas) {
    badge.innerHTML = '<a href="/account" class="hover:!text-accent hover:underline">Log in / Sign up</a>';
    return;
  }

  const authed = await fas.isAuthenticated?.();
  if (!authed) {
    badge.innerHTML = '<a href="/account" class="hover:!text-accent hover:underline">Log in / Sign up</a>';
    return;
  }

  const session = await fas.getSession?.();
  const name = session?.user?.email || 'there';
  badge.innerHTML = `<span class="text-white/80">Welcome, ${name}</span>`;
}

initHeaderAuth();
