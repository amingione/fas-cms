import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
  try {
    const DOMAIN = (import.meta.env.PUBLIC_AUTH0_DOMAIN ||
      import.meta.env.AUTH0_DOMAIN ||
      'login.fasmotorsports.com') as string;
    const CLIENT_ID = (import.meta.env.PUBLIC_AUTH0_CLIENT_ID ||
      import.meta.env.AUTH0_CLIENT_ID ||
      'zMZZoiIamhK5ItezIjPMJ0b3TLj7LDCY') as string;
    const SITE_URL = import.meta.env.PUBLIC_SITE_URL as string | undefined;

    const url = new URL(request.url);

    // Use the exact current origin by default to match Auth0 Allowed Logout URLs
    const currentOrigin = `${url.protocol}//${url.host}`;

    // If a fully-qualified returnTo is provided, trust it; else prefer PUBLIC_SITE_URL; else use current origin
    let baseReturn = url.searchParams.get('returnTo') || SITE_URL || currentOrigin;

    // Ensure baseReturn is a valid URL and keep its exact origin (no www stripping / protocol forcing)
    try {
      const u = new URL(baseReturn);
      baseReturn = `${u.protocol}//${u.host}`; // origin only
    } catch {
      baseReturn = currentOrigin;
    }

    // Final returnTo path — send users back to /account
    const rt = `${baseReturn}/account`;

    // Build the Auth0 logout URL using normalized returnTo
    const logoutUrl = `https://${DOMAIN}/v2/logout?client_id=${encodeURIComponent(CLIENT_ID)}&returnTo=${encodeURIComponent(rt)}`;

    // Clear the token cookie used by server routes
    const clearCookie = `token=; Path=/; Max-Age=0; SameSite=Lax${url.protocol === 'https:' ? '; Secure' : ''}`;

    return new Response(null, {
      status: 302,
      headers: {
        Location: logoutUrl,
        'Set-Cookie': clearCookie
      }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Logout failed' }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }
};
