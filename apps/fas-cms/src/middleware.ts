import type { MiddlewareHandler } from 'astro';
import { readSession } from './server/auth/session';

const PROTECTED_CUSTOMER = [/^\/dashboard(?:\/.*)?$/];
const PROTECTED_VENDOR = [/^\/vendor(?:\/.*)?$/];
const PROTECTED_ADMIN = [/^\/admin(?:\/.*)?$/];

const PUBLIC_VENDOR_PATHS = new Set([
  '/vendor/login',
  '/vendor/apply',
  '/vendor/apply.client.ts',
  '/vendor/forgot-password',
  '/vendor/reset'
]);

const isMatch = (path: string, patterns: RegExp[]) => patterns.some((re) => re.test(path));

export const onRequest: MiddlewareHandler = async (context, next) => {
  const rawPath = new URL(context.url).pathname;
  const pathname = rawPath.length > 1 && rawPath.endsWith('/') ? rawPath.slice(0, -1) : rawPath;
  // Allowlisted vendor paths stay public (eg. login/apply pages)
  if (PUBLIC_VENDOR_PATHS.has(pathname)) {
    return next();
  }

  // Only apply to protected routes
  if (!isMatch(pathname, [...PROTECTED_CUSTOMER, ...PROTECTED_VENDOR, ...PROTECTED_ADMIN])) {
    return next();
  }
  const { session } = await readSession(context.request);
  if (!session?.user) {
    const loginPath = isMatch(pathname, PROTECTED_VENDOR)
      ? '/vendor/login'
      : '/account';
    const loginUrl = new URL(loginPath, context.url);
    loginUrl.searchParams.set('returnTo', pathname);
    return context.redirect(loginUrl.toString());
  }
  const roles = session.user.roles || [];
  const hasRole = (role: string) => roles.includes(role.toLowerCase());
  if (isMatch(pathname, PROTECTED_ADMIN)) {
    if (!hasRole('admin')) {
      return new Response('Forbidden (admin only)', { status: 403 });
    }
  } else if (isMatch(pathname, PROTECTED_VENDOR)) {
    if (!hasRole('vendor') && !hasRole('admin')) {
      return new Response('Forbidden (vendor only)', { status: 403 });
    }
  } else if (isMatch(pathname, PROTECTED_CUSTOMER)) {
    // any authenticated user can access dashboard
  }
  return next();
};
