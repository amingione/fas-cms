import { getAuth0Client } from '@/lib/auth';

// Handles the small account panel in the header/sidebar
window.addEventListener('DOMContentLoaded', async () => {
  const loginLink = document.getElementById('loginLink');
  const logoutLink = document.getElementById('logoutLink');

  try {
    const auth0 = await getAuth0Client();
    const isAuthenticated = await auth0.isAuthenticated();

    if (isAuthenticated) {
      logoutLink?.classList.remove('hidden');
      loginLink?.classList.add('hidden');
    } else {
      loginLink?.classList.remove('hidden');
      logoutLink?.classList.add('hidden');
    }

    loginLink?.addEventListener('click', async (e) => {
      e.preventDefault();
      await auth0.loginWithRedirect({
        appState: { returnTo: '/dashboard' },
        authorizationParams: { redirect_uri: window.location.origin + '/account' }
      });
    });

    logoutLink?.addEventListener('click', async (e) => {
      e.preventDefault();
      await auth0.logout({ logoutParams: { returnTo: window.location.origin } });
    });
  } catch (err) {
    console.warn('[account-dashboard-panel] auth init failed', err);
  }
});
