import type { MiddlewareHandler } from 'astro';
import jwt from 'jsonwebtoken';
const SESSION_SECRET = import.meta.env.SESSION_SECRET;

export const onRequest: MiddlewareHandler = async ({ request, redirect, locals }, next) => {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/admin')) return next();
  const cookie = request.headers.get('cookie') || '';
  const session = /(?:^|;\s*)session=([^;]+)/.exec(cookie)?.[1];
  if (!session) return redirect('/.netlify/functions/auth-login');
  try {
    const payload = jwt.verify(session, SESSION_SECRET) as any;
    if (!payload.roles?.some((r: string) => ['owner', 'staff'].includes(r)))
      return new Response('Forbidden', { status: 403 });
    (locals as any).user = payload;
    return next();
  } catch {
    return redirect('/.netlify/functions/auth-login');
  }
};
