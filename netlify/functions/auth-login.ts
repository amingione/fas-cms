import 'dotenv/config';
import type { Handler } from '@netlify/functions';

const getEnv = (k: string) => process.env[k];

const resolveDomain = () => {
  const direct = getEnv('AUTH0_DOMAIN') || getEnv('PUBLIC_AUTH0_DOMAIN');
  const fromIssuer = (getEnv('AUTH0_ISSUER_BASE_URL') || '').replace(/^https?:\/\//, '');
  return direct || fromIssuer;
};

const resolveClientId = () => getEnv('AUTH0_CLIENT_ID') || getEnv('PUBLIC_AUTH0_CLIENT_ID');

const deriveBaseUrl = (event: any) => {
  try {
    const proto = event.headers['x-forwarded-proto'] || 'https';
    const host = event.headers['x-forwarded-host'] || event.headers['host'];
    if (host) return `${proto}://${host}`;
  } catch {}
  const base = getEnv('PUBLIC_SITE_URL');
  return (base && base.replace(/\/$/, '')) || 'https://fasmotorsports.com';
};

export const handler: Handler = async (event) => {
  const domain = resolveDomain();
  const clientId = resolveClientId();
  const baseUrl = deriveBaseUrl(event);
  const redirectUri = `${baseUrl}/.netlify/functions/auth-callback`;

  if (!domain || !clientId || !redirectUri) {
    const missing = [
      !domain && 'AUTH0_DOMAIN/PUBLIC_AUTH0_DOMAIN/AUTH0_ISSUER_BASE_URL',
      !clientId && 'AUTH0_CLIENT_ID/PUBLIC_AUTH0_CLIENT_ID',
      !redirectUri && 'Base URL (headers) or PUBLIC_SITE_URL'
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

  // Optional returnTo (preserve target across login) via cookie
  const returnTo = event.queryStringParameters?.returnTo || '';
  const headers: Record<string, string> = { Location: authUrl.toString() };
  if (returnTo) {
    const isSecure = baseUrl.startsWith('https://');
    headers['Set-Cookie'] = `fas_return_to=${encodeURIComponent(returnTo)}; Path=/; Max-Age=600; SameSite=Lax${isSecure ? '; Secure' : ''}`;
  }

  return { statusCode: 302, headers };
};

export default { handler };
