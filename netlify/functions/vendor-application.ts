import type { Handler } from '@netlify/functions';
import { handleVendorApplication } from '../../src/server/vendor-application-handler';

export const handler: Handler = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const result = await handleVendorApplication(body);
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
