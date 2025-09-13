import type { APIRoute } from 'astro';

// /api/auth/login -> Redirect the browser to Auth0 (Authorization Code + PKCE)
export const GET: APIRoute = async ({ request }) => {
  // Derive origin from the incoming request to match www/non-www environments
  const origin = new URL(request.url).origin;
  // Prefer the actual request origin to avoid www/apex mismatches
  const baseUrl = origin || process.env.PUBLIC_SITE_URL || 'http://localhost:4321';
  const redirectUri = `${baseUrl}/account`; // finish login on /account (do not pre-encode)

  const auth0Domain = 'login.fasmotorsports.com';
  const clientId = process.env.PUBLIC_AUTH0_CLIENT_ID || 'zMZZoiIamhK5ItezIjPMJ0b3TLj7LDCY';

  // Build Auth0 authorize URL
  const loginUrl = new URL(`https://${auth0Domain}/authorize`);
  loginUrl.searchParams.set('response_type', 'code');
  loginUrl.searchParams.set('client_id', clientId);
  loginUrl.searchParams.set('redirect_uri', redirectUri);
  loginUrl.searchParams.set('scope', 'openid profile email');

  // Optional: support returnTo via short-lived cookie so /account can redirect after auth
  const reqUrl = new URL(request.url);
  const returnTo = reqUrl.searchParams.get('returnTo');
  const headers: Record<string, string> = { Location: loginUrl.toString() };
  if (returnTo) {
    const isSecure = baseUrl.startsWith('https://');
    headers['Set-Cookie'] = `fas_return_to=${encodeURIComponent(returnTo)}; Path=/; Max-Age=600; SameSite=Lax${isSecure ? '; Secure' : ''}`;
  }

  return new Response(null, { status: 302, headers });
};
