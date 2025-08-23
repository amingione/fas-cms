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

    if (!DOMAIN || !CLIENT_ID) {
      return new Response(JSON.stringify({ error: 'Auth0 env not configured' }), {
        status: 500,
        headers: { 'content-type': 'application/json' }
      });
    }

    const url = new URL(request.url);
    const inferredOrigin = `${url.protocol}//${url.host}`;

    // Preferred return target from query or env, else current origin
    const rawReturn = url.searchParams.get('returnTo') || SITE_URL || inferredOrigin;

    // Normalize: force https in prod, strip leading www. (Auth0 requires exact match)
    let rt: string;
    try {
      const r = new URL(rawReturn);
      const isLocal = /localhost|127\.0\.0\.1/.test(r.hostname);
      const hostNoWww = r.hostname.replace(/^www\./, '');
      const proto = isLocal ? r.protocol : 'https:';
      rt = `${proto}//${hostNoWww}${r.port && isLocal ? `:${r.port}` : ''}`;
    } catch {
      rt = inferredOrigin;
    }

    // Build the Auth0 logout URL using normalized returnTo
    const logoutUrl = `https://${DOMAIN}/v2/logout?client_id=${encodeURIComponent(CLIENT_ID)}&returnTo=${encodeURIComponent(rt + '/account')}`;

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
