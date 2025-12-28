import type { APIRoute } from 'astro';
import { handleVendorApplication } from '../../server/vendor-application-handler';
import { vendorApplicationSchema } from '@/lib/validators/api-requests';

export const POST: APIRoute = async ({ request }) => {
  try {
    const bodyResult = vendorApplicationSchema.safeParse(await request.json());
    if (!bodyResult.success) {
      console.error('[validation-failure]', {
        schema: 'vendorApplicationSchema',
        context: 'api/vendor-application',
        identifier: 'unknown',
        timestamp: new Date().toISOString(),
        errors: bodyResult.error.format()
      });
      return new Response(
        JSON.stringify({ message: 'Validation failed', details: bodyResult.error.format() }),
        {
          status: 422,
          headers: { 'content-type': 'application/json' }
        }
      );
    }
    const result = await handleVendorApplication(bodyResult.data);
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
