type FasAuth = {
  isAuthenticated: () => Promise<boolean>;
  loginTo: (returnTo: string) => Promise<void>;
  logout: (returnTo?: string) => Promise<void>;
};

declare global {
  interface Window {
    fasAuth?: FasAuth;
  }
}

// Small header account panel toggle using fas-auth
window.addEventListener('DOMContentLoaded', async () => {
  const loginLink = document.getElementById('loginLink');
  const logoutLink = document.getElementById('logoutLink');
  const fas = window.fasAuth;

  const showLoggedOut = () => {
    loginLink?.classList.remove('hidden');
    logoutLink?.classList.add('hidden');
  };

  const showLoggedIn = () => {
    loginLink?.classList.add('hidden');
    logoutLink?.classList.remove('hidden');
  };

  if (!fas) {
    showLoggedOut();
    loginLink?.addEventListener('click', () => (window.location.href = '/account'));
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
