import type { Handler, HandlerResponse } from '@netlify/functions';

const methodNotAllowed = (): HandlerResponse => ({
  statusCode: 405,
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ error: 'Method Not Allowed' })
});

const deprecated = (): HandlerResponse => ({
  statusCode: 410,
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify({
    error:
      'Deprecated legacy commerce endpoint. Customer and invoice operations must flow through Medusa-authoritative admin APIs.',
    code: 'legacy_commerce_endpoint_disabled'
  })
});

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return methodNotAllowed();
  return deprecated();
};

export default { handler };
