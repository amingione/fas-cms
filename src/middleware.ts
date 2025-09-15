import type { MiddlewareHandler } from 'astro';
import jwt from 'jsonwebtoken';

const SESSION_SECRET = import.meta.env.SESSION_SECRET;

export const onRequest: MiddlewareHandler = async ({ request, redirect, locals }, next) => {
  const url = new URL(request.url);

  // Normalize OAuth callbacks only on expected entry pages and only when both code & state are present.
  // This avoids redirecting normal pages that happen to get a stray param.
  {
    const hasCode = url.searchParams.has('code');
    const hasState = url.searchParams.has('state');
    const onAuthEntry = url.pathname === '/' || url.pathname === '/account' || url.pathname === '/dashboard';
    const isFn = url.pathname.startsWith('/.netlify/functions');
    if (hasCode && hasState && onAuthEntry && !isFn) {
      const qs = url.searchParams.toString();
      return redirect(`/.netlify/functions/auth-callback${qs ? `?${qs}` : ''}`);
    }
  }

  // Only guard /admin
  if (!url.pathname.startsWith('/admin')) return next();

  // In dev, don't hard-block with middleware — let the SPA guard handle it
  if (import.meta.env.DEV) return next();

  const cookie = request.headers.get('cookie') || '';
  const session = /(?:^|;\s*)session=([^;]+)/.exec(cookie)?.[1];

  // No session — send to /account so the SPA can initiate Auth0 login
  if (!session) return redirect('/account');

  try {
    const payload = jwt.verify(session, SESSION_SECRET) as any;
    // Expect roles as an array of strings; normalize case
    const roles: string[] = Array.isArray(payload?.roles)
      ? payload.roles.map((r: string) => (r || '').toLowerCase())
      : [];

    // Allow owner OR employee (case-insensitive)
    const allowed = roles.some((r) => r === 'owner' || r === 'employee');
    if (!allowed) return redirect('/account');

    // Attach user to locals for downstream handlers if needed
    (locals as any).user = payload;
    return next();
  } catch {
    // Invalid/expired session — route to /account to re-auth
    return redirect('/account');
  }
};
