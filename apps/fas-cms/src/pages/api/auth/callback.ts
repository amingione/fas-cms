import type { APIRoute } from 'astro';
import { exchangeCodeForToken } from '../../../server/auth/auth0';
import { setSessionCookie } from '../../../server/auth/session';

export const GET: APIRoute = async ({ url }) => {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state') || '/';
  if (!code) {
    return new Response('Missing code', { status: 400 });
  }
  try {
    const jwt = await exchangeCodeForToken(code);
    const headers = new Headers();
    setSessionCookie(headers, jwt);
    headers.set('Location', state);
    return new Response(null, { status: 302, headers });
  } catch (err) {
    console.error(err);
    return new Response('Auth0 callback error', { status: 500 });
  }
};