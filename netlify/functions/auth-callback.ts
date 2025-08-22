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

export const handler: Handler = async (event) => {
  const params = new URLSearchParams(event.rawQuery || '');
  const code = params.get('code');
  if (!code) return { statusCode: 400, body: 'Missing code' };

  // Parse cookies
  const cookies = Object.fromEntries(
    (event.headers.cookie || '')
      .split(';')
      .map((c) => c.trim())
      .filter(Boolean)
      .map((c) => c.split('='))
  ) as Record<string, string>;
  const verifier = cookies['pkce_verifier'];

  // Resolve required env vars (tolerate variants)
  const domain = resolveDomain();
  const clientId = getEnv('AUTH0_CLIENT_ID') || getEnv('PUBLIC_AUTH0_CLIENT_ID');
  const clientSecret = getEnv('AUTH0_CLIENT_SECRET');
  const redirectUri = getEnv('AUTH_REDIRECT_URI');
  const sessionSecret = getEnv('SESSION_SECRET');

  if (!domain || !clientId || !clientSecret || !redirectUri || !sessionSecret) {
    const missing = [
      !domain && 'AUTH0_DOMAIN/PUBLIC_AUTH0_DOMAIN/AUTH0_ISSUER_BASE_URL',
      !clientId && 'AUTH0_CLIENT_ID/PUBLIC_AUTH0_CLIENT_ID',
      !clientSecret && 'AUTH0_CLIENT_SECRET',
      !redirectUri && 'AUTH_REDIRECT_URI',
      !sessionSecret && 'SESSION_SECRET'
    ]
      .filter(Boolean)
      .join(', ');
    return { statusCode: 500, body: `Auth callback misconfigured. Missing: ${missing}` };
  }

  const issuer = domain.startsWith('http') ? domain : `https://${domain}`;

  // Exchange code for tokens
  const tokenRes = await fetch(`${issuer}/oauth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      code_verifier: verifier
    })
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text().catch(() => '');
    return { statusCode: 502, body: `Token exchange failed${text ? `: ${text}` : ''}` };
  }

  const tokens = (await tokenRes.json()) as { id_token: string };

  // Create a short, signed **session** cookie from ID token claims you need
  const idClaims = jwt.decode(tokens.id_token) as any;
  const roles =
    idClaims?.['https://fasmotorsport.com/fas/roles'] || idClaims?.['https://fas/roles'] || [];

  const session = jwt.sign({ sub: idClaims?.sub, email: idClaims?.email, roles }, sessionSecret!, {
    expiresIn: '7d'
  });

  const headers = {
    'Set-Cookie': [
      `session=${session}; HttpOnly; Secure; Path=/; Max-Age=604800; SameSite=Lax`,
      'pkce_verifier=; Max-Age=0; Path=/',
      'oauth_state=; Max-Age=0; Path=/'
    ].join(', '),
    Location: '/admin'
  };

  return { statusCode: 302, headers };
};

export default { handler };
