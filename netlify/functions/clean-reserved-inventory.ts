import type { Handler, HandlerResponse } from '@netlify/functions';

export const config = {
  schedule: '0 * * * *'
};

// Keep scheduled invocation green while this legacy inventory path is retired.
const acknowledgedNoop = (): HandlerResponse => ({
  statusCode: 200,
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify({
    ok: true,
    deprecated: true,
    cleaned: 0,
    message:
      'Deprecated legacy inventory cleanup endpoint. Inventory reservation cleanup must flow through Medusa workflows.'
  })
});

export const handler: Handler = async () => acknowledgedNoop();

export default { handler, config };
