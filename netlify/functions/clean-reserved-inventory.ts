import type { Handler } from '@netlify/functions';
import { sanity } from './_sanity';

export const config = {
  schedule: '0 * * * *'
};

export const handler: Handler = async () => {
  try {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const expiredOrders = await sanity.fetch(
      `*[_type == "order" 
      && paymentStatus != "paid" 
      && createdAt < $cutoffTime
      && status != "cancelled"
    ]{
      _id,
      orderNumber,
      cart[]{
        productRef,
        sku,
        quantity
      }
    }`,
      { cutoffTime }
    );

    for (const order of expiredOrders || []) {
      for (const item of order.cart || []) {
        if (item.sku) {
          await sanity
            .patch(item.productRef?._ref || item.productRef)
            .dec({ [`variants[sku == "${item.sku}"].inventory.quantityReserved`]: item.quantity || 0 })
            .commit();
        } else {
          await sanity
            .patch(item.productRef?._ref || item.productRef)
            .dec({ 'inventory.quantityReserved': item.quantity || 0 })
            .commit();
        }
      }

      await sanity.patch(order._id).set({ status: 'expired' }).commit();
      console.log(`Released inventory for expired order: ${order.orderNumber}`);
    }

    return { statusCode: 200, body: JSON.stringify({ cleaned: expiredOrders?.length || 0 }) };
  } catch (error: any) {
    console.error('[clean-reserved-inventory] failed', error?.message || error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to clean reserved inventory' }) };
  }
};

export default { handler, config };
