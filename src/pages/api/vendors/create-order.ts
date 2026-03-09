import type { APIRoute } from 'astro';
import { jsonResponse } from '@/server/http/responses';

export const POST: APIRoute = async () => {
  return jsonResponse(
    {
      error:
        'Deprecated endpoint. Vendor order creation is Medusa-authoritative and must run through Medusa workflows.'
    },
    { status: 410 },
    { noIndex: true }
  );
};
