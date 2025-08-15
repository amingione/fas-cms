// netlify/functions/syncAuth0User.ts
import type { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  const sent = event.headers['x-auth0-sync-secret'];
  const expected = process.env.AUTH0_SYNC_SECRET;

  if (!expected) return { statusCode: 500, body: 'Missing AUTH0_SYNC_SECRET' };
  if (!sent || sent !== expected) return { statusCode: 401, body: 'Unauthorized' };

  // Parse body
  const payload = JSON.parse(event.body || '{}');

  // TODO: upsert user in your DB, or call Sanity with a server token if you want a shadow record
  // await upsertUser(payload.user)

  return { statusCode: 200, body: 'OK' };
};
