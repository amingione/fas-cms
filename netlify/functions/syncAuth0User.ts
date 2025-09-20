// netlify/functions/syncAuth0User.ts
import type { Handler } from '@netlify/functions';

// NOTE: If you change environment variables in Netlify UI, you must redeploy
// the site for new values to reach functions. Remove the debug messages below
// once things are verified.

export const handler: Handler = async (event) => {
  // CORS (allow Auth0 Actions + local tests). Adjust `origin` to your needs.
  const corsHeaders = {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type, x-auth0-sync-secret',
    'access-control-allow-methods': 'POST, OPTIONS',
    'content-type': 'application/json; charset=utf-8'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  // Read secret from header (Netlify lower-cases incoming headers)
  const sent =
    event.headers['x-auth0-sync-secret'] ||
    // fallback in case some client sends it differently (rare)
    (event.headers as any)['X-Auth0-Sync-Secret'];

  const expected = process.env.AUTH0_SYNC_SECRET;

  if (!expected) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Missing AUTH0_SYNC_SECRET on server' })
    };
  }

  if (!sent || sent !== expected) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Unauthorized: secret mismatch' })
    };
  }

  // Parse body safely
  let payload: any;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Invalid JSON' })
    };
  }

  // TODO: upsert user in your DB, or forward to your app as needed
  // Example minimal shape:
  const user = payload?.user || null;

  // You can add your own logic here (no-op for now)

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({ ok: true, received: Boolean(user) })
  };
};
