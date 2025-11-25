import type { Handler } from '@netlify/functions';
import { sanity } from './_sanity';
import { getCollectionProducts } from '../../src/server/sanity/collections';

export const config = { schedule: '0 * * * *' };

export const handler: Handler = async () => {
  try {
    const collections = await sanity.fetch(
      `*[_type == "collection"]{ _id, collectionType, "manualCount": count(manualProducts) }`
    );

    for (const collection of collections || []) {
      let productCount = 0;
      if (collection.collectionType === 'manual') {
        productCount = collection.manualCount || 0;
      } else {
        const products = await getCollectionProducts(sanity, collection._id as string);
        productCount = products?.length || 0;
      }

      await sanity
        .patch(collection._id)
        .set({ productCount, lastUpdated: new Date().toISOString() })
        .commit();
    }

    return { statusCode: 200, body: JSON.stringify({ updated: collections?.length || 0 }) };
  } catch (error: any) {
    console.error('[collection-counts-cron] failed', error?.message || error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to update collection counts' }) };
  }
};

export default { handler, config };
