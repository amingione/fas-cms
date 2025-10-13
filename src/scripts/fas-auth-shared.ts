export type FasAuth = {
  isAuthenticated: () => Promise<boolean>;
  getSession: () => Promise<{ user?: { id: string; email?: string; roles?: string[] } } | null>;
  loginTo: (returnTo: string) => Promise<void>;
  login: (returnTo?: string) => Promise<void>;
  logout: (returnTo?: string) => Promise<void>;
};

declare global {
  interface Window {
    fasAuth?: FasAuth;
  }
}

export const ensureFasAuthLoaded = async (): Promise<FasAuth | undefined> => {
  if (typeof window === 'undefined') return undefined;
  if (window.fasAuth) return window.fasAuth;
  await new Promise((resolve) => setTimeout(resolve, 100));
  return window.fasAuth;
};

export const getFallbackFasAuth = (): FasAuth => ({
  loginTo: async (path) => window.location.assign(path),
  login: async (path) => window.location.assign(path ?? '/account'),
  logout: async () => {},
  isAuthenticated: async () => false,
  getSession: async () => null
});

export {};
