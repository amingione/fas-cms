import type { Handler, HandlerResponse } from '@netlify/functions';

const deprecated = (): HandlerResponse => ({
  statusCode: 410,
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify({
    error:
      'Deprecated legacy commerce endpoint. Order reads must flow through Medusa-authoritative APIs.',
    code: 'legacy_commerce_endpoint_disabled'
  })
});

export const handler: Handler = async () => deprecated();

export default { handler };
