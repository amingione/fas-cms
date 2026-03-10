import type { Handler, HandlerResponse } from '@netlify/functions';

const methodNotAllowed = (): HandlerResponse => ({
  statusCode: 405,
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ error: 'Method Not Allowed' })
});

// Keep webhook ack success to avoid retry storms after retirement.
const acknowledgedNoop = (): HandlerResponse => ({
  statusCode: 200,
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify({
    ok: true,
    deprecated: true,
    message:
      'Deprecated legacy tracking endpoint. Shipment tracking updates must flow through Medusa webhooks/workflows.'
  })
});

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return methodNotAllowed();
  return acknowledgedNoop();
};

export default { handler };
