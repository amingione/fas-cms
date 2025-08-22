import 'dotenv/config'

import type { Handler } from '@netlify/functions';
import crypto from 'crypto';

const getEnv = (k: string) => process.env[k];

const resolveDomain = () => {
  const direct = getEnv('AUTH0_DOMAIN') || getEnv('PUBLIC_AUTH0_DOMAIN');
  const fromIssuer = (getEnv('AUTH0_ISSUER_BASE_URL') || '').replace(/^https?:\/\//, '');
  return direct || fromIssuer;
};

const resolveClientId = () => getEnv('AUTH0_CLIENT_ID') || getEnv('PUBLIC_AUTH0_CLIENT_ID');

const resolveRedirectUri = () => {
  // Prefer explicit override
  const explicit = getEnv('AUTH_REDIRECT_URI');
  if (explicit) return explicit;
  // Fallback: derive from PUBLIC_SITE_URL if present
  const base = getEnv('PUBLIC_SITE_URL');
  if (base) return `${base.replace(/\/$/, '')}/.netlify/functions/auth-callback`;
  return undefined;
};

export const handler: Handler = async () => {
  const domain = resolveDomain();
  const clientId = resolveClientId();
  const redirectUri = resolveRedirectUri();

  if (!domain || !clientId || !redirectUri) {
    const missing = [
      !domain && 'AUTH0_DOMAIN/PUBLIC_AUTH0_DOMAIN/AUTH0_ISSUER_BASE_URL',
      !clientId && 'AUTH0_CLIENT_ID/PUBLIC_AUTH0_CLIENT_ID',
      !redirectUri && 'AUTH_REDIRECT_URI or PUBLIC_SITE_URL'
    ]
      .filter(Boolean)
      .join(', ');
    return { statusCode: 500, body: `Auth login misconfigured. Missing: ${missing}` };
  }

  // PKCE
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  const state = crypto.randomBytes(16).toString('base64url');

  const issuer = domain.startsWith('http') ? domain : `https://${domain}`;
  const authUrl = new URL(`${issuer}/authorize`);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
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

export default { handler };
