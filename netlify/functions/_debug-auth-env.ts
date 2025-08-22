import 'dotenv/config';
import type { Handler } from '@netlify/functions';

const pick = (k: string) => (process.env[k] ? 'SET' : 'MISSING');

export const handler: Handler = async () => {
  const report = {
    AUTH0_DOMAIN: pick('AUTH0_DOMAIN'),
    PUBLIC_AUTH0_DOMAIN: pick('PUBLIC_AUTH0_DOMAIN'),
    AUTH0_ISSUER_BASE_URL: pick('AUTH0_ISSUER_BASE_URL'),
    AUTH0_CLIENT_ID: pick('AUTH0_CLIENT_ID'),
    PUBLIC_AUTH0_CLIENT_ID: pick('PUBLIC_AUTH0_CLIENT_ID'),
    AUTH0_CLIENT_SECRET: pick('AUTH0_CLIENT_SECRET'),
    AUTH0_SECRET: pick('AUTH0_SECRET'),
    AUTH_REDIRECT_URI: pick('AUTH_REDIRECT_URI'),
    PUBLIC_SITE_URL: pick('PUBLIC_SITE_URL'),
    SESSION_SECRET: pick('SESSION_SECRET')
  };

  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(report, null, 2)
  };
};

export default { handler };
