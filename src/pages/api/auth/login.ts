import type { APIRoute } from 'astro';

// /api/auth/login -> Redirect the browser to Auth0 (Authorization Code + PKCE)
export const GET: APIRoute = async ({ redirect }) => {
  const baseUrl = process.env.PUBLIC_SITE_URL || 'http://localhost:4321';
  const redirectUri = encodeURIComponent(`${baseUrl}/account`); // we finish login on /account

  const auth0Domain = 'login.fasmotorsports.com';
  const clientId = process.env.PUBLIC_AUTH0_CLIENT_ID || 'zMZZoiIamhK5ItezIjPMJ0b3TLj7LDCY';

  // Use response_type=code (Auth Code + PKCE). auth0-spa-js will exchange the code on /account.
  const loginUrl = `https://${auth0Domain}/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=openid%20profile%20email`;

  return redirect(loginUrl);
};
