import type { MiddlewareHandler } from 'astro';
import jwt from 'jsonwebtoken';

const SESSION_SECRET = import.meta.env.SESSION_SECRET;

export const onRequest: MiddlewareHandler = async ({ request, redirect, locals }, next) => {
  const url = new URL(request.url);

  // Only guard /admin
  if (!url.pathname.startsWith('/admin')) return next();

  // In dev, don't hard-block with middleware — let the client guard handle it
  if (import.meta.env.DEV) return next();

  const cookie = request.headers.get('cookie') || '';
  const session = /(?:^|;\s*)fas_session=([^;]+)/.exec(cookie)?.[1];

  if (!session) return redirect('/account');

  try {
    const payload = jwt.verify(session, SESSION_SECRET) as any;
    const roles: string[] = Array.isArray(payload?.roles)
      ? payload.roles.map((r: string) => (r || '').toLowerCase())
      : [];
    const allowed = roles.some((r) => r === 'owner' || r === 'employee' || r === 'admin');
    if (!allowed) return redirect('/account');
    (locals as any).user = payload;
    return next();
  } catch {
    return redirect('/account');
  }
};
