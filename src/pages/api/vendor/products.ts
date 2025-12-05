import type { APIRoute } from 'astro';
import { jsonResponse } from '@/server/http/responses';

export const GET: APIRoute = async ({ request }) => {
  void request;
  return jsonResponse(
    { message: 'Vendor-managed product catalogs are disabled. Browse the wholesale catalog instead.' },
    { status: 410 },
    { noIndex: true }
  );
};

export const PUT: APIRoute = async ({ request }) => {
  void request;
  return jsonResponse(
    { message: 'Vendor-managed product catalogs are disabled. Browse the wholesale catalog instead.' },
    { status: 410 },
    { noIndex: true }
  );
};
