import type { APIRoute } from 'astro';
import { clearSessionCookie } from '@/server/auth/session';

export const POST: APIRoute = async () => {
  const headers = new Headers({ 'content-type': 'application/json' });
  clearSessionCookie(headers);
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
};
