import { defineMiddleware } from 'astro:middleware';
import { readSession } from './server/auth/session';

const ALLOWED_PUBLIC = new Set([
  '/vendor-portal/login',
  '/vendor-portal/forgot-password',
  '/vendor-portal/reset-password'
]);

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, request, redirect } = context;
  const path = url.pathname;

  if (path.startsWith('/vendor-portal')) {
    const isSetupRoute = path === '/vendor-portal/setup';
    if (!ALLOWED_PUBLIC.has(path) && !isSetupRoute) {
      const { session } = await readSession(request);
      const roles = Array.isArray(session?.user?.roles)
        ? session!.user.roles.map((role) => String(role || '').toLowerCase())
        : [];
      const isVendorSession = roles.includes('vendor') || roles.includes('admin');
      if (!session?.user || !isVendorSession) {
        const returnTo = encodeURIComponent(path + (url.search || ''));
        return redirect(`/vendor-portal/login?returnTo=${returnTo}&error=vendor-only`);
      }
    }
  }

  return next();
});
