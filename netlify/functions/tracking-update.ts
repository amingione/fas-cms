import type { Handler } from '@netlify/functions';

const methodNotAllowed = (): ReturnType<Handler> => ({
  statusCode: 405,
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ error: 'Method Not Allowed' })
});

// Keep webhook ack success to avoid retry storms after retirement.
const acknowledgedNoop = (): ReturnType<Handler> => ({
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
