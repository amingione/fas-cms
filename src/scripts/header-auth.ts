import { ensureFasAuthLoaded } from './fas-auth-shared';

function ready(fn: () => void) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  } else {
    fn();
  }
}

function setAnonymous(
  badgeLink: HTMLAnchorElement | null,
  desktopLink: HTMLAnchorElement | null
) {
  if (badgeLink) {
    badgeLink.href = '/account';
    badgeLink.textContent = 'Sign in';
    badgeLink.dataset.authState = 'signed-out';
    badgeLink.title = 'Sign in';
  }
  if (desktopLink) {
    desktopLink.href = '/account';
    desktopLink.textContent = 'Sign in';
    desktopLink.dataset.authState = 'signed-out';
    desktopLink.title = 'Sign in to your account';
  }
}

function applyAuthenticatedState(
  name: string,
  badgeLink: HTMLAnchorElement | null,
  desktopLink: HTMLAnchorElement | null
) {
  const label = name || 'My Account';
  if (badgeLink) {
    badgeLink.href = '/dashboard';
    badgeLink.textContent = label;
    badgeLink.dataset.authState = 'signed-in';
    badgeLink.title = `Go to ${label}'s dashboard`;
  }
  if (desktopLink) {
    desktopLink.href = '/dashboard';
    desktopLink.textContent = label;
    desktopLink.dataset.authState = 'signed-in';
    desktopLink.title = `Open ${label}'s dashboard`;
  }
}

ready(async () => {
  const badgeRoot = document.getElementById('account-top-badge');
  const badgeLink = badgeRoot?.querySelector('a') ?? null;
  const desktopLink = document.getElementById('account-desktop-link') as HTMLAnchorElement | null;

  if (!badgeLink && !desktopLink) return;

  const fas = await ensureFasAuthLoaded();
  if (!fas) {
    setAnonymous(badgeLink, desktopLink);
    return;
  }

  try {
    const authed = await fas.isAuthenticated();
    if (!authed) {
      setAnonymous(badgeLink, desktopLink);
      return;
    }
    const session = await fas.getSession();
    const user = session?.user ?? {};
    let name =
      (typeof user.given_name === 'string' && user.given_name.trim()) ||
      (typeof user.name === 'string' && user.name.trim()) ||
      (typeof user.email === 'string' && user.email.trim()) ||
      '';
    if (!name) {
      try {
        const cached =
          localStorage.getItem('customerName') ||
          localStorage.getItem('customerEmail') ||
          '';
        if (cached) name = cached.trim();
      } catch {
        // ignore access errors (Safari private mode, etc.)
      }
    }
    applyAuthenticatedState(name, badgeLink, desktopLink);
  } catch (err) {
    console.warn('[header-auth] failed to resolve session', err);
    setAnonymous(badgeLink, desktopLink);
  }
});

export {};
