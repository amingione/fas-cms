// Lightweight shim that ensures window.fasAuth (provided by /public/fas-auth.js)
// exposes helpers similar to the legacy Auth0 client so existing scripts keep working.

const MAX_WAIT = 40;
const WAIT_MS = 100;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForFasAuth(): Promise<any> {
  let attempt = 0;
  while (!(window as any).fasAuth && attempt < MAX_WAIT) {
    await sleep(WAIT_MS);
    attempt += 1;
  }
  return (window as any).fasAuth || null;
}

(async () => {
  const fas = await waitForFasAuth();
  if (!fas) {
    console.warn('[account-auth] fasAuth shim not found (make sure /fas-auth.js is loaded).');
    return;
  }

  // Normalise helper methods so dashboard/admin scripts can rely on them.
  if (typeof fas.getSession !== 'function') {
    fas.getSession = async () => {
      try {
        const res = await fetch('/api/auth/session', { credentials: 'include' });
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    };
  }

  if (typeof fas.isAuthenticated !== 'function') {
    fas.isAuthenticated = async () => {
      const sess = await fas.getSession();
      return !!(sess && sess.user);
    };
  }

  if (typeof fas.hasRole !== 'function') {
    fas.hasRole = async (role: string | string[]) => {
      try {
        const sess = await fas.getSession();
        const raw = sess?.user?.role || (sess?.user as any)?.roles || [];
        const roles = Array.isArray(raw) ? raw : raw ? [raw] : [];
        const have = new Set(roles.map((r: string) => String(r || '').toLowerCase()));
        if (Array.isArray(role)) return role.some((r) => have.has(String(r || '').toLowerCase()));
        return have.has(String(role || '').toLowerCase());
      } catch {
        return false;
      }
    };
  }

  if (typeof fas.getUser !== 'function') {
    fas.getUser = async () => {
      const sess = await fas.getSession();
      return sess?.user || null;
    };
  }

  if (typeof fas.getIdTokenClaims !== 'function') {
    fas.getIdTokenClaims = async () => {
      const sess = await fas.getSession();
      const raw = sess?.user?.role || (sess?.user as any)?.roles || [];
      const roles = Array.isArray(raw) ? raw : raw ? [raw] : [];
      const lower = roles.map((r: string) => String(r || '').toLowerCase());
      return {
        roles: lower,
        'https://fasmotorsports.com/roles': lower
      } as Record<string, unknown>;
    };
  }

  // Expose the normalised object.
  (window as any).fasAuth = fas;
})();

export {};
