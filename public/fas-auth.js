// Lightweight façade used by your components instead of pulling in a library.
// Backed by API routes under `/api/auth`.

(function () {
  async function getJSON(url, opts = {}) {
    const res = await fetch(url, { credentials: 'include', ...opts });
    if (res.status === 401 || res.status === 403) return null;
    return res.ok ? res.json() : null;
  }

  const fasAuth = {
    async isAuthenticated() {
      const data = await getJSON('/api/auth/session');
      return !!(data && data.user);
    },
    async getSession() {
      return await getJSON('/api/auth/session');
    },
    async hasRole(role) {
      try {
        const sess = await getJSON('/api/auth/session');
        const r = (sess && sess.user && (sess.user.role || sess.user.roles)) || null;
        const roles = Array.isArray(r) ? r : (r ? [r] : []);
        const have = new Set(roles.map((x) => String(x || '').toLowerCase()));
        if (Array.isArray(role)) return role.some((x) => have.has(String(x || '').toLowerCase()));
        return have.has(String(role || '').toLowerCase());
      } catch { return false; }
    },
    async loginTo(returnTo = '/') {
      // Redirect to account page where the login form will submit and then navigate back
      const url = new URL('/account', window.location.origin);
      if (returnTo) url.searchParams.set('returnTo', returnTo);
      window.location.href = url.toString();
    },
    async logout(returnTo = window.location.origin) {
      const url = new URL('/api/auth/logout', window.location.origin);
      url.searchParams.set('returnTo', returnTo);
      window.location.href = url.toString();
    },
  };

  window.fasAuth = fasAuth;
})();
