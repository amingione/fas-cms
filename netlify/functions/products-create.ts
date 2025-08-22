// /netlify/functions/products-create.ts
import type { Handler } from '@netlify/functions';
import jwt from 'jsonwebtoken';
// /netlify/functions/_sanity.ts
import sanityClient from '@sanity/client';

export function getClient() {
  return sanityClient({
    projectId: process.env.SANITY_PROJECT_ID,
    dataset: process.env.SANITY_DATASET,
    token: process.env.SANITY_TOKEN,
    useCdn: false,
    apiVersion: '2023-06-07'
  });
}

const { SESSION_SECRET } = process.env;

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const cookie = event.headers.cookie || '';
  const session = /(?:^|;\s*)session=([^;]+)/.exec(cookie)?.[1];
  if (!session) {
    return { statusCode: 401, body: 'Unauthorized' };
  }

  try {
    const user = jwt.verify(session, SESSION_SECRET!) as any;
    if (!user.roles?.some((r: string) => ['owner', 'staff'].includes(r))) {
      return { statusCode: 403, body: 'Forbidden' };
    }
  } catch {
    return { statusCode: 401, body: 'Invalid session' };
  }

  // …validate body and write to Sanity with token on server…
  // For now, return a default response to ensure a HandlerResponse is always returned.
  return { statusCode: 200, body: 'OK' };
};
