import { ensureFasAuthLoaded } from './fas-auth-shared';

(async () => {
  const badge = document.getElementById('account-top-badge');
  if (!badge) return;

  const fas = await ensureFasAuthLoaded();
  if (!fas) {
    badge.innerHTML = `<a href="/account" class="hover:!text-accent hover:underline">Log in / Sign up</a>`;
    return;
  }

  try {
    const authed = await fas.isAuthenticated();
    if (!authed) {
      badge.innerHTML = `<a href="/account" class="hover:!text-accent hover:underline">Log in / Sign up</a>`;
      return;
    }
    const session = await fas.getSession();
    const name = session?.user?.email || session?.user?.id || 'there';
    badge.innerHTML = `<span class="text-white/80">Welcome, ${name}</span>`;
  } catch (err) {
    console.warn('[header-auth] failed to resolve session', err);
    badge.innerHTML = `<a href="/account" class="hover:!text-accent hover:underline">Log in / Sign up</a>`;
  }
})();
