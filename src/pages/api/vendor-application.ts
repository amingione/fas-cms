import type { APIRoute } from 'astro';
import { handleVendorApplication } from '../../server/vendor-application-handler';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const result = await handleVendorApplication(body);
    return new Response(JSON.stringify(result.body), {
      status: result.status,
      headers: { 'content-type': 'application/json' }
    });
  } catch (err) {
    console.error('Vendor application failed:', err);
    return new Response(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }
};
