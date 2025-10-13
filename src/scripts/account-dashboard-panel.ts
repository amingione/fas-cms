import { ensureFasAuthLoaded, getFallbackFasAuth, type FasAuth } from './fas-auth-shared';

// Small header account panel toggle using fas-auth
window.addEventListener('DOMContentLoaded', async () => {
  const loginLink = document.getElementById('loginLink');
  const logoutLink = document.getElementById('logoutLink');

  const showLoggedOut = () => {
    loginLink?.classList.remove('hidden');
    logoutLink?.classList.add('hidden');
  };

  const showLoggedIn = () => {
    loginLink?.classList.add('hidden');
    logoutLink?.classList.remove('hidden');
  };

  const fas = await ensureFasAuthLoaded();
  const auth: FasAuth = fas ?? getFallbackFasAuth();

  if (!fas) {
    showLoggedOut();
    loginLink?.addEventListener('click', (e) => {
      e.preventDefault();
      auth.loginTo('/account');
    });
    logoutLink?.classList.add('hidden');
    return;
  }

  try {
    const authed = await fas.isAuthenticated();
    if (authed) {
      showLoggedIn();
    } else {
      showLoggedOut();
    }
  } catch (err) {
    console.warn('[account-dashboard-panel] session check failed', err);
    showLoggedOut();
  }

  loginLink?.addEventListener('click', (e) => {
    e.preventDefault();
    fas.loginTo('/dashboard');
  });

  logoutLink?.addEventListener('click', (e) => {
    e.preventDefault();
    fas.logout(window.location.origin);
  });
});
