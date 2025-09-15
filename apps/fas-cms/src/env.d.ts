export {};

declare global {
  interface Window {
    fasAuth: {
      isAuthenticated: () => Promise<boolean>;
      getSession: () => Promise<{ user?: { id: string; email?: string; role?: 'customer' | 'vendor' | 'admin' } } | null>;
      loginTo: (returnTo?: string) => void | Promise<void>;
      logout: (returnTo?: string) => void | Promise<void>;
    };
  }
}