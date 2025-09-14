import 'dotenv/config';
import type { Handler } from '@netlify/functions';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';

const getEnv = (k: string) => process.env[k];

const resolveDomain = () => {
  const direct = getEnv('AUTH0_DOMAIN') || getEnv('PUBLIC_AUTH0_DOMAIN');
  const fromIssuer = (getEnv('AUTH0_ISSUER_BASE_URL') || '').replace(/^https?:\/\//, '');
  return direct || fromIssuer;
};

const deriveBaseUrl = (event: any) => {
  try {
    let proto = event.headers['x-forwarded-proto'] || '';
    const host = event.headers['x-forwarded-host'] || event.headers['host'];
    if (!proto) proto = host && /localhost|127\.0\.0\.1/.test(host) ? 'http' : 'https';
    if (host) return `${proto}://${host}`;
  } catch {}
  const base = getEnv('PUBLIC_SITE_URL');
  return (base && base.replace(/\/$/, '')) || 'https://fasmotorsports.com';
};

export const handler: Handler = async (event) => {
  const params = new URLSearchParams(event.rawQuery || '');
  const code = params.get('code');
  if (!code) return { statusCode: 400, body: 'Missing code' };

  // Resolve required env vars
  const domain = resolveDomain();
  const clientId = getEnv('AUTH0_CLIENT_ID') || getEnv('PUBLIC_AUTH0_CLIENT_ID');
  const clientSecret = getEnv('AUTH0_CLIENT_SECRET');
  const baseUrl = deriveBaseUrl(event);
  const redirectUri = `${baseUrl}/.netlify/functions/auth-callback`;
  const sessionSecret = getEnv('SESSION_SECRET');

  if (!domain || !clientId || !clientSecret || !redirectUri || !sessionSecret) {
    const missing = [
      !domain && 'AUTH0_DOMAIN/PUBLIC_AUTH0_DOMAIN/AUTH0_ISSUER_BASE_URL',
      !clientId && 'AUTH0_CLIENT_ID/PUBLIC_AUTH0_CLIENT_ID',
      !clientSecret && 'AUTH0_CLIENT_SECRET',
      !redirectUri && 'Base URL (headers) or PUBLIC_SITE_URL',
      !sessionSecret && 'SESSION_SECRET'
    ]
      .filter(Boolean)
      .join(', ');
    return { statusCode: 500, body: `Auth callback misconfigured. Missing: ${missing}` };
  }

  const issuer = domain.startsWith('http') ? domain : `https://${domain}`;

  // Exchange code for tokens (no PKCE)
  const tokenRes = await fetch(`${issuer}/oauth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri
    })
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text().catch(() => '');
    const safeReport = {
      status: tokenRes.status,
      issuer,
      clientIdTail: (clientId || '').slice(-6),
      redirectUri,
      body: text.slice(0, 500)
    };
    console.error('[auth-callback] token exchange failed', safeReport);
    return { statusCode: 502, body: `Token exchange failed: ${JSON.stringify(safeReport)}` };
  }

  const tokens = (await tokenRes.json()) as { id_token: string };

  // Create a signed session cookie from ID token claims
  const idClaims = jwt.decode(tokens.id_token) as any;
  // Normalize roles from common claim namespaces
  const roles =
    idClaims?.['https://login.fasmotorsports.com/fas/roles'] ||
    idClaims?.['https://fasmotorsports.com/roles'] ||
    idClaims?.['https://schemas.quickstarts.auth0.com/roles'] ||
    [];

  const session = jwt.sign({ sub: idClaims?.sub, email: idClaims?.email, roles }, sessionSecret!, {
    expiresIn: '7d'
  });

  const isLocal = (redirectUri || '').startsWith('http://localhost') || (redirectUri || '').startsWith('http://127.0.0.1');
  const sessionFlags = `HttpOnly; Path=/; Max-Age=604800; SameSite=Lax${isLocal ? '' : '; Secure'}`;
  // Determine post-login redirect target
  let nextLocation = '/dashboard';
  try {
    const cookieHeader = event.headers.cookie || event.headers.Cookie || '';
    const m = /(?:^|;\s*)fas_return_to=([^;]+)/.exec(cookieHeader);
    const rt = m && m[1] ? decodeURIComponent(m[1]) : '';
    // Safety: only allow same-site relative paths
    if (rt && rt.startsWith('/') && !rt.startsWith('//')) nextLocation = rt;
  } catch {}

  const headers = {
    'Set-Cookie': [`session=${session}; ${sessionFlags}`, 'fas_return_to=; Path=/; Max-Age=0; SameSite=Lax'].join(', '),
    Location: nextLocation
  } as Record<string, string>;

  return { statusCode: 302, headers };
};

export default { handler };
