import type { MiddlewareHandler } from 'astro';
import jwt from 'jsonwebtoken';

const SESSION_SECRET = import.meta.env.SESSION_SECRET;
const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'fas_session';
const PUBLIC_VENDOR_PATHS = new Set(['/vendor/login', '/vendor/apply']);

const normalizePath = (path: string) => {
  if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1);
  return path;
};

const extractSession = (headers: Headers) => {
  const cookie = headers.get('cookie') || '';
  const match = new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`).exec(cookie);
  return match?.[1] ?? null;
};

const redirectTo = (origin: URL, target: string, returnTo: string) => {
  const url = new URL(target, origin);
  if (returnTo) url.searchParams.set('returnTo', returnTo);
  return url.toString();
};

export const onRequest: MiddlewareHandler = async ({ request, redirect, locals }, next) => {
  const url = new URL(request.url);
  const pathname = normalizePath(url.pathname);

  if (PUBLIC_VENDOR_PATHS.has(pathname)) {
    return next();
  }

  const isAdminRoute = pathname.startsWith('/admin');
  const isVendorRoute = pathname.startsWith('/vendor');

  if (!isAdminRoute && !isVendorRoute) {
    return next();
  }

  if (import.meta.env.DEV && isAdminRoute) {
    return next();
  }

  const sessionToken = extractSession(request.headers);
  if (!sessionToken) {
    const location = redirectTo(url, isVendorRoute ? '/vendor/login' : '/account', pathname);
    return redirect(location);
  }

  let payload: any;
  try {
    payload = jwt.verify(sessionToken, SESSION_SECRET) as any;
  } catch {
    const location = redirectTo(url, isVendorRoute ? '/vendor/login' : '/account', pathname);
    return redirect(location);
  }

  const roles: string[] = Array.isArray(payload?.roles)
    ? payload.roles.map((r: string) => String(r || '').toLowerCase())
    : [];
  const primaryRole = String(payload?.role || roles[0] || '').toLowerCase();

  if (isAdminRoute) {
    const allowed = roles.concat(primaryRole ? [primaryRole] : []).some((r) =>
      r === 'owner' || r === 'employee' || r === 'admin'
    );
    if (!allowed) {
      return redirect('/account');
    }
  }

  if (isVendorRoute) {
    if (primaryRole !== 'vendor' && primaryRole !== 'admin') {
      const location = redirectTo(url, '/vendor/login', pathname);
      return redirect(location);
    }
  }

  (locals as any).user = payload;
  return next();
};
