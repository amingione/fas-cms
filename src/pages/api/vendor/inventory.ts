import type { APIRoute } from 'astro';
import { jsonResponse } from '@/server/http/responses';

export const GET: APIRoute = async ({ request }) => {
  void request;
  return jsonResponse(
    { message: 'Vendor-managed inventory is disabled. Wholesale ordering is available via the catalog.' },
    { status: 410 },
    { noIndex: true }
  );
};

export const PUT: APIRoute = async ({ request }) => {
  void request;
  return jsonResponse(
    { message: 'Vendor-managed inventory is disabled. Wholesale ordering is available via the catalog.' },
    { status: 410 },
    { noIndex: true }
  );
};
