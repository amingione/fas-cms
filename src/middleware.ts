import { defineMiddleware } from 'astro:middleware';
import { readSession } from './server/auth/session';

const ALLOWED_PUBLIC = new Set([
  '/vendor-portal/login',
  '/vendor-portal/forgot-password',
  '/vendor-portal/reset-password'
]);

const TRAILING_SLASH_EXCLUDED_PREFIXES = ['/api/', '/.netlify/'];

const isPageLikePath = (path: string): boolean => {
  if (!path || path === '/') return false;
  if (path.endsWith('/')) return false;
  if (TRAILING_SLASH_EXCLUDED_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return false;
  }
  const lastSegment = path.split('/').pop() ?? '';
  return !lastSegment.includes('.');
};

const normalizePathForChecks = (path: string): string => {
  if (!path || path === '/') return '/';
  return path.replace(/\/+$/, '');
};

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, request, redirect } = context;
  const path = url.pathname;
  const method = request.method.toUpperCase();

  // Enforce canonical trailing-slash URLs for all page-like paths.
  // This prevents Astro 404s on non-slash paths when trailingSlash='always'
  // and keeps internal/SEO links canonical without relying on implicit behavior.
  if ((method === 'GET' || method === 'HEAD') && isPageLikePath(path)) {
    return redirect(`${path}/${url.search}`, 308);
  }

  const normalizedPath = normalizePathForChecks(path);

  if (normalizedPath.startsWith('/vendor-portal')) {
    const isSetupRoute = normalizedPath === '/vendor-portal/setup';
    if (!ALLOWED_PUBLIC.has(normalizedPath) && !isSetupRoute) {
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
