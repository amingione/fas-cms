// Lightweight global Auth0 bootstrap so pages like /admin can trigger login
import { getAuth0Client } from '@/lib/auth';

declare global {
  interface Window {
    fasAuth?: {
      isAuthenticated: () => Promise<boolean>;
      getUser: () => Promise<any>;
      getIdTokenClaims: () => Promise<any>;
      loginTo: (returnTo: string) => Promise<void>;
      logout: (returnTo?: string) => Promise<void>;
      hasRole: (role: string | string[]) => Promise<boolean>;
    };
  }
}

async function init() {
  try {
    const auth0 = await getAuth0Client();
    if (!window.fasAuth) {
      window.fasAuth = {
        isAuthenticated: () => auth0.isAuthenticated(),
        getUser: () => auth0.getUser(),
        getIdTokenClaims: () => auth0.getIdTokenClaims(),
        loginTo: (returnTo: string) =>
          auth0.loginWithRedirect({
            appState: { returnTo },
            authorizationParams: { redirect_uri: `${window.location.origin}/account` }
          }),
        logout: (returnTo?: string) =>
          auth0.logout({ logoutParams: { returnTo: returnTo || `${window.location.origin}/account` } }),
        hasRole: async (role: string | string[]) => {
          try {
            const claims = await auth0.getIdTokenClaims();
            const roles =
              (claims?.['https://login.fasmotorsport.com/fas/roles'] as string[]) ||
              (claims?.['https://fasmotorsports.com/roles'] as string[]) ||
              (claims?.['https://schemas.quickstarts.auth0.com/roles'] as string[]) ||
              [];
            const norm = (s: string) => (s || '').toLowerCase();
            const have = new Set(roles.map(norm));
            if (Array.isArray(role)) return role.map(norm).some((r) => have.has(r));
            return have.has(norm(role));
          } catch {
            return false;
          }
        }
      };
    }
  } catch (e) {
    // no-op: auth might be misconfigured; consumers should handle gracefully
    console.warn('[auth-bootstrap] Failed to initialize Auth0', e);
  }
}

// Eager init after load
if (document.readyState === 'complete' || document.readyState === 'interactive') init();
else window.addEventListener('DOMContentLoaded', init);

