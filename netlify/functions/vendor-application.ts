import type { Handler } from '@netlify/functions';
import { handleVendorApplication } from '../../src/server/vendor-application-handler';
import { vendorApplicationSchema } from '../../src/lib/validators/api-requests';

export const handler: Handler = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const bodyResult = vendorApplicationSchema.safeParse(body);
    if (!bodyResult.success) {
      console.error('[validation-failure]', {
        schema: 'vendorApplicationSchema',
        context: 'netlify/vendor-application',
        identifier: 'unknown',
        timestamp: new Date().toISOString(),
        errors: bodyResult.error.format()
      });
      return {
        statusCode: 400,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid request', details: bodyResult.error.format() })
      };
    }
    const result = await handleVendorApplication(bodyResult.data);
    return {
      statusCode: result.status,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(result.body)
    };
  } catch (err) {
    console.error('[vendor-application] failed', err);
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'Internal server error' })
    };
  }
};
