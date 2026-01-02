import type { APIRoute } from 'astro';
import { jsonResponse } from '@/server/http/responses';

export const POST: APIRoute = async ({ request }) => {
  void request;
  return jsonResponse(
    { message: 'Direct purchase order submissions are disabled. Use the wholesale cart and checkout.' },
    { status: 410 },
    { noIndex: true }
  );
};
