import type { Handler } from '@netlify/functions';

const methodNotAllowed = (): ReturnType<Handler> => ({
  statusCode: 405,
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ error: 'Method Not Allowed' })
});

const deprecated = (): ReturnType<Handler> => ({
  statusCode: 410,
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify({
    error:
      'Deprecated legacy commerce endpoint. Order status updates must flow through Medusa-authoritative admin APIs.',
    code: 'legacy_commerce_endpoint_disabled'
  })
});

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return methodNotAllowed();
  return deprecated();
};

export default { handler };
