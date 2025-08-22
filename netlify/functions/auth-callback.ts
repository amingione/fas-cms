import type { Handler } from '@netlify/functions';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';

const { AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, AUTH_REDIRECT_URI, SESSION_SECRET } =
  process.env;

export const handler: Handler = async (event) => {
  const params = new URLSearchParams(event.rawQuery || '');
  const code = params.get('code');
  if (!code) return { statusCode: 400, body: 'Missing code' };

  const cookies = Object.fromEntries(
    (event.headers.cookie || '').split(';').map((c) => c.trim().split('='))
  );
  const verifier = cookies['pkce_verifier'];

  const tokenRes = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: AUTH0_CLIENT_ID,
      client_secret: AUTH0_CLIENT_SECRET,
      code,
      redirect_uri: AUTH_REDIRECT_URI,
      code_verifier: verifier
    })
  });
  if (!tokenRes.ok) return { statusCode: 500, body: 'Token exchange failed' };
  const tokens = (await tokenRes.json()) as { id_token: string };

  // Create a short, signed **session** cookie from the ID token claims you need
  const idClaims = jwt.decode(tokens.id_token) as any;
  const roles =
    idClaims?.['https://fasmotorsport.com/fas/roles'] || idClaims?.['https://fas/roles'] || [];
  const session = jwt.sign({ sub: idClaims?.sub, email: idClaims?.email, roles }, SESSION_SECRET!, {
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
