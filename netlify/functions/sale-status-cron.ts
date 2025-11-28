import type { Handler } from '@netlify/functions';
import { sanity } from './_sanity';

export const config = {
  schedule: '0 * * * *'
};

export const handler: Handler = async () => {
  try {
    const now = new Date().toISOString();

    const productsToActivate = await sanity.fetch(
      `*[_type == "product" 
      && pricing.onSale == true 
      && pricing.saleActive != true
      && pricing.saleStartDate <= $now
      && (pricing.saleEndDate > $now || !defined(pricing.saleEndDate))
    ]._id`,
      { now }
    );

    for (const id of productsToActivate || []) {
      await sanity.patch(id).set({ 'pricing.saleActive': true }).commit();
    }

    const productsToDeactivate = await sanity.fetch(
      `*[_type == "product" 
      && pricing.onSale == true 
      && pricing.saleActive == true
      && defined(pricing.saleEndDate)
      && pricing.saleEndDate <= $now
    ]._id`,
      { now }
    );

    for (const id of productsToDeactivate || []) {
      await sanity.patch(id).set({ 'pricing.saleActive': false }).commit();
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        activated: productsToActivate?.length || 0,
        deactivated: productsToDeactivate?.length || 0
      })
    };
  } catch (error: any) {
    console.error('[sale-status-cron] failed', error?.message || error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to update sales' }) };
  }
};

export default { handler, config };
