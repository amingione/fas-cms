import type { APIRoute } from 'astro';
import { clearSessionCookie } from '../../../server/auth/session';

export const GET: APIRoute = async ({ url }) => {
  const returnTo = url.searchParams.get('returnTo') || '/';
  const headers = new Headers();
  clearSessionCookie(headers);
  headers.set('Location', returnTo);
  return new Response(null, { status: 302, headers });
};