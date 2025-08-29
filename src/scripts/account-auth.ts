// src/scripts/account-auth.ts
import { getAuth0Client } from '../lib/auth'; // note the path from scripts → lib

declare global {
  interface Window {
    _auth0?: any;
    fasAuth?: {
      isAuthenticated: () => Promise<boolean>;
      getUser: () => Promise<any>;
      loginTo: (returnTo: string) => Promise<void>;
      logout: (returnTo?: string) => Promise<void>;
      hasRole: (role: string) => Promise<boolean>;
    };
  }
}

const buttonGroup = `
        <div class="relative flex gap-4">
          <button id="login" class="relative px-4 py-2 bg-primary text-black font-ethno">Log in</button>
          <button id="signup" class="relative px-4 py-2 border border-white/40 font-ethno">Sign up</button>
        </div>`;

const root = document.getElementById('account-view');

const show = (html: string) => {
  if (root) {
    root.innerHTML = html;
    root.dataset.viewReady = 'true';
  }
};

// Fallback: if still empty after 5s, show login/signup
setTimeout(() => {
  if (root && (!root.dataset.viewReady || root.textContent.includes('Loading'))) {
    console.warn('⏰ Fallback triggered — forcing login/signup UI');
    show(`
            <h1 class="text-2xl mb-4 font-ethno text-primary">Account</h1>
            <p class="mb-4">Could not confirm login status. Please log in.</p>
            ${buttonGroup}
          `);
  }
}, 5000);

(async () => {
  console.log('🚀 account page script loaded');

  const withTimeout = <T>(p: Promise<T>, ms = 8000): Promise<T> =>
    Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

  try {
    const auth0 = await withTimeout(getAuth0Client(), 8000);
    window._auth0 = auth0;
    // Expose small helper API for other pages (e.g., /admin)
    window.fasAuth = {
      isAuthenticated: () => auth0.isAuthenticated(),
      getUser: () => auth0.getUser(),
      loginTo: (returnTo: string) =>
        auth0.loginWithRedirect({
          appState: { returnTo },
          authorizationParams: {
            redirect_uri: `${window.location.origin}/account`
          }
        }),
      logout: (returnTo?: string) =>
        auth0.logout({
          logoutParams: {
            returnTo: returnTo || `${window.location.origin}/account`
          }
        }),
      hasRole: async (role: string | string[]) => {
        try {
          const claims = await auth0.getIdTokenClaims();
          const roles =
            (claims?.['https://login.fasmotorsport.com/fas/roles'] as string[]) ||
            (claims?.['https://fasmotorsports.com/roles'] as string[]) ||
            (claims?.['https://schemas.quickstarts.auth0.com/roles'] as string[]) ||
            [];
          if (Array.isArray(role)) {
            return role.some((r) => roles.includes(r));
          }
          return roles.includes(role);
        } catch {
          return false;
        }
      }
    };
    console.log('✅ auth0 client ready');

    // Support logout via query param, e.g., /account?logout=1 or /account?action=logout
    try {
      const url = new URL(window.location.href);
      const wantsLogout =
        url.pathname === '/account' &&
        (url.searchParams.get('logout') === '1' || url.searchParams.get('action') === 'logout');
      if (wantsLogout) {
        await auth0.logout({ logoutParams: { returnTo: `${window.location.origin}/account` } });
        return;
      }
    } catch {}

    // Handle redirect callback
    if (window.location.search.includes('code=') && window.location.search.includes('state=')) {
      try {
        const { appState } = await withTimeout(auth0.handleRedirectCallback(), 8000);
        window.history.replaceState({}, document.title, window.location.pathname);
        if (appState?.returnTo) {
          // send user back to intended destination (e.g., /admin)
          window.location.assign(appState.returnTo);
          return;
        }
      } catch (e) {
        console.warn('Redirect handling failed', e);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    let authed = false;
    try {
      authed = await withTimeout(auth0.isAuthenticated(), 8000);
    } catch (e) {
      console.warn('isAuthenticated failed', e);
    }
    console.log('🔍 authed?', authed);

    if (!authed) {
      show(`
              <h1 class="text-2xl mb-4 font-borg text-primary">Account</h1>
              <p class="mb-6">Log in or create an account to access your dashboard.</p>
              ${buttonGroup}
            `);
      document.getElementById('login')?.addEventListener('click', () => {
        localStorage.removeItem('customerEmail');
        document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
        auth0.loginWithRedirect({
          authorizationParams: {
            screen_hint: 'login',
            redirect_uri: window.location.origin + '/account'
          }
        });
      });
      document.getElementById('signup')?.addEventListener('click', () => {
        localStorage.removeItem('customerEmail');
        document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
        auth0.loginWithRedirect({
          authorizationParams: {
            screen_hint: 'signup',
            redirect_uri: window.location.origin + '/account'
          }
        });
      });
      return;
    }

    // Warm up/refresh token silently so subsequent API calls have a fresh access token
    try {
      await withTimeout(auth0.getTokenSilently(), 8000);
    } catch (e) {
      console.warn('silent token refresh failed', e);
    }

    // Authenticated path
    type Auth0User = {
      email?: string;
      given_name?: string;
      name?: string;
      [key: string]: any;
    };

    const user: Auth0User = (await withTimeout(auth0.getUser(), 8000)) ?? ({} as Auth0User);
    const claims = await withTimeout(auth0.getIdTokenClaims(), 8000).catch(() => null);
    const token = claims?.__raw;
    if (token && claims?.exp) {
      try {
        document.cookie = `token=${token}; path=/; SameSite=Lax; ${window.location.protocol === 'https:' ? 'Secure;' : ''} expires=${new Date(claims.exp * 1000).toUTCString()}`;
      } catch {}
    }
    if ('email' in user && user.email) {
      try {
        localStorage.setItem('customerEmail', user.email);
      } catch {}
    }

    const name = user?.given_name || user?.name || user?.email || 'there';
    show(`
            <p class="mb-6">Hello, <span class="text-red-500">${name}</span></p>
            <a href="/customerdashboard/customerProfile" class="underline">My Account →</a>
          `);
  } catch (err: any) {
    console.error('❌ account script error', err);
    show(`
            <h1 class="text-2xl mb-4 font-borg text-primary">Account</h1>
            <p class="mb-4">We couldn’t load your account. ${err?.message === 'timeout' ? 'Request timed out.' : 'Please try again.'}</p>
            ${buttonGroup}
          `);
  }
})();
