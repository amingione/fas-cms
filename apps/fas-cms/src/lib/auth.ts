const MAX_WAIT = 40;
const WAIT_MS = 100;

async function waitForFasAuth(): Promise<any | null> {
  let attempts = 0;
  while (!(window as any).fasAuth && attempts < MAX_WAIT) {
    await new Promise((resolve) => setTimeout(resolve, WAIT_MS));
    attempts += 1;
  }
  return (window as any).fasAuth || null;
}

type LoginOptions = {
  appState?: { returnTo?: string };
  authorizationParams?: { redirect_uri?: string; screen_hint?: string };
};

type LogoutOptions = {
  logoutParams?: { returnTo?: string };
};

export interface AuthClient {
  isAuthenticated(): Promise<boolean>;
  getUser(): Promise<any>;
  getIdTokenClaims(): Promise<any>;
  loginWithRedirect(options?: LoginOptions): Promise<void>;
  logout(options?: LogoutOptions): Promise<void>;
  handleRedirectCallback(): Promise<{ appState?: { returnTo?: string } } | void>;
}

export async function getAuth0Client(): Promise<AuthClient> {
  if (typeof window === 'undefined') {
    throw new Error('fasAuth client is only available in the browser');
  }
  const fas = await waitForFasAuth();
  if (!fas) {
    throw new Error('fasAuth shim not available');
  }

  return {
    async isAuthenticated() {
      return Boolean(await fas.isAuthenticated?.());
    },
    async getUser() {
      const session = await fas.getSession?.();
      return {
        email: session?.user?.email,
        sub: session?.user?.id,
        roles: session?.user?.roles || []
      };
    },
    async getIdTokenClaims() {
      const session = await fas.getSession?.();
      const roles = (session?.user?.roles || []).map((r: string) => r.toLowerCase());
      return {
        roles,
        'https://fasmotorsports.com/roles': roles
      };
    },
    async loginWithRedirect(options?: LoginOptions) {
      const returnTo = options?.appState?.returnTo || '/dashboard';
      const target = options?.authorizationParams?.redirect_uri || `${window.location.origin}/account`;
      const url = new URL(target, window.location.origin);
      url.searchParams.set('returnTo', returnTo);
      window.location.href = url.toString();
    },
    async logout(options?: LogoutOptions) {
      const returnTo = options?.logoutParams?.returnTo || `${window.location.origin}/account`;
      const url = new URL('/api/auth/logout', window.location.origin);
      url.searchParams.set('returnTo', returnTo);
      window.location.href = url.toString();
    },
    async handleRedirectCallback() {
      // No special handling needed; just strip query params
      return {};
    }
  };
}
