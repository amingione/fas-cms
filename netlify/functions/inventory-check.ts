import type { Handler } from '@netlify/functions';
import { sanity } from './_sanity';
import { inventoryCheckQuery } from '../../src/lib/storefrontQueries';

export const handler: Handler = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const productIds: string[] = Array.isArray(body.productIds) ? body.productIds : [];
    const variantSkus: string[] = Array.isArray(body.variantSkus) ? body.variantSkus : [];

    if (!productIds.length) {
      return { statusCode: 400, body: JSON.stringify({ error: 'productIds is required' }) };
    }

    const result = await sanity.fetch(inventoryCheckQuery, { productIds, variantSkus });
    return { statusCode: 200, body: JSON.stringify({ inventory: result }) };
  } catch (error: any) {
    console.error('[inventory-check] failed', error?.message || error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to check inventory' }) };
  }
};

export default { handler };
