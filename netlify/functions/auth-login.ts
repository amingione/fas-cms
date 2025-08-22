import type { Handler } from '@netlify/functions';
import crypto from 'crypto';
const { AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH_REDIRECT_URI } = process.env;

export const handler: Handler = async () => {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  const state = crypto.randomBytes(16).toString('base64url');

  const authUrl = new URL(`https://${AUTH0_DOMAIN}/authorize`);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', AUTH0_CLIENT_ID!);
  authUrl.searchParams.set('redirect_uri', AUTH_REDIRECT_URI!);
  authUrl.searchParams.set('scope', 'openid profile email');
  authUrl.searchParams.set('code_challenge', challenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('state', state);

  // set temporary cookies for PKCE/state (5 min)
  const headers = {
    'Set-Cookie': [
      `pkce_verifier=${verifier}; HttpOnly; Secure; Path=/; Max-Age=300; SameSite=Lax`,
      `oauth_state=${state}; HttpOnly; Secure; Path=/; Max-Age=300; SameSite=Lax`
    ].join(', '),
    Location: authUrl.toString()
  };
  return { statusCode: 302, headers };
};
