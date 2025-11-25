import type { Handler } from '@netlify/functions';
import { sanity } from './_sanity';

export const config = {
  schedule: '*/15 * * * *'
};

export const handler: Handler = async () => {
  try {
    const products = await sanity.fetch(
      `*[_type == "product" && inventory.trackInventory == true]{
      _id,
      "inStock": inventory.quantityInStock,
      "reserved": inventory.quantityReserved,
      "lowThreshold": inventory.lowStockThreshold
    }`
    );

    for (const product of products || []) {
      const available = Number(product.inStock || 0) - Number(product.reserved || 0);
      await sanity.patch(product._id).set({ 'inventory.quantityAvailable': available }).commit();

      if (available <= Number(product.lowThreshold || 0) && available > 0) {
        console.log(`LOW STOCK ALERT: Product ${product._id} has ${available} units left`);
      }
    }

    const variantProducts = await sanity.fetch(
      `*[_type == "product" && hasVariants == true]{
      _id,
      variants[]{
        _key,
        "inStock": inventory.quantityInStock,
        "reserved": inventory.quantityReserved
      }
    }`
    );

    for (const product of variantProducts || []) {
      for (const variant of product.variants || []) {
        const available = Number(variant.inStock || 0) - Number(variant.reserved || 0);
        await sanity
          .patch(product._id)
          .set({ [`variants[_key == "${variant._key}"].inventory.quantityAvailable`]: available })
          .commit();
      }
    }

    return { statusCode: 200, body: JSON.stringify({ synced: true }) };
  } catch (error: any) {
    console.error('[inventory-sync] failed', error?.message || error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to sync inventory' }) };
  }
};

export default { handler, config };
