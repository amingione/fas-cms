import type { MiddlewareHandler } from 'astro';
import { readSession } from './server/auth/session';

const PROTECTED_CUSTOMER = [/^\/dashboard(?:\/.*)?$/];
const PROTECTED_VENDOR = [/^\/vendor(?:\/.*)?$/];
const PROTECTED_ADMIN = [/^\/admin(?:\/.*)?$/];

const isMatch = (path: string, patterns: RegExp[]) => patterns.some((re) => re.test(path));

export const onRequest: MiddlewareHandler = async (context, next) => {
  const pathname = new URL(context.url).pathname;
  // Only apply to protected routes
  if (!isMatch(pathname, [...PROTECTED_CUSTOMER, ...PROTECTED_VENDOR, ...PROTECTED_ADMIN])) {
    return next();
  }
  const { session } = await readSession(context.request);
  if (!session?.user) {
    const loginUrl = new URL('/api/auth/login', context.url);
    loginUrl.searchParams.set('returnTo', pathname);
    return context.redirect(loginUrl.toString());
  }
  const role = session.user.role;
  if (isMatch(pathname, PROTECTED_ADMIN)) {
    if (role !== 'admin') {
      return new Response('Forbidden (admin only)', { status: 403 });
    }
  } else if (isMatch(pathname, PROTECTED_VENDOR)) {
    if (role !== 'vendor' && role !== 'admin') {
      return new Response('Forbidden (vendor only)', { status: 403 });
    }
  } else if (isMatch(pathname, PROTECTED_CUSTOMER)) {
    // any authenticated user can access dashboard
  }
  return next();
};