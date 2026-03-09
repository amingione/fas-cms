import type { Handler } from '@netlify/functions';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'OPTIONS,GET,POST'
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  return {
    statusCode: 410,
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      error:
        'Deprecated legacy commerce endpoint. Commerce products, pricing, inventory, carts, checkout, and orders are Medusa-authoritative.'
    })
  };
};

export default handler;
