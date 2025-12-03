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
    if (!ALLOWED_PUBLIC.has(path)) {
      const { session } = await readSession(request);
      if (!session?.user) {
        const returnTo = encodeURIComponent(path + (url.search || ''));
        return redirect(`/vendor-portal/login?returnTo=${returnTo}`);
      }
    }
  }

  return next();
});
