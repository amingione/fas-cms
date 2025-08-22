import type { Handler } from '@netlify/functions';
const { AUTH0_DOMAIN, AUTH0_CLIENT_ID } = process.env;
export const handler: Handler = async () => ({
  statusCode: 302,
  headers: {
    'Set-Cookie': 'session=; HttpOnly; Secure; Path=/; Max-Age=0; SameSite=Lax',
    Location: `https://${AUTH0_DOMAIN}/v2/logout?client_id=${AUTH0_CLIENT_ID}&returnTo=/`
  }
});
