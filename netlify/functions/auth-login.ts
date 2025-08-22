import 'dotenv/config';
import type { Handler } from '@netlify/functions';

const getEnv = (k: string) => process.env[k];

const resolveDomain = () => {
  const direct = getEnv('AUTH0_DOMAIN') || getEnv('PUBLIC_AUTH0_DOMAIN');
  const fromIssuer = (getEnv('AUTH0_ISSUER_BASE_URL') || '').replace(/^https?:\/\//, '');
  return direct || fromIssuer;
};

const resolveClientId = () => getEnv('AUTH0_CLIENT_ID') || getEnv('PUBLIC_AUTH0_CLIENT_ID');

const resolveRedirectUri = () => {
  const explicit = getEnv('AUTH_REDIRECT_URI');
  if (explicit) return explicit;
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

  const issuer = domain.startsWith('http') ? domain : `https://${domain}`;
  const authUrl = new URL(`${issuer}/authorize`);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', 'openid profile email');

  return {
    statusCode: 302,
    headers: { Location: authUrl.toString() }
  };
};

export default { handler };
