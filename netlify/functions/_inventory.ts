import { sanity } from './_sanity';

export type InventoryOrderItem = {
  productId?: string | null;
  quantity: number;
  variantSku?: string | null;
  sku?: string | null;
};

type InventoryTransactionType = 'sale' | 'return' | 'reservation' | 'release';

const validQuantity = (qty: number | undefined | null): qty is number =>
  typeof qty === 'number' && Number.isFinite(qty) && qty > 0;

async function logInventoryTransaction(
  productId: string,
  quantity: number,
  type: InventoryTransactionType,
  reference?: string,
  reason?: string
) {
  const entry = {
    _type: 'inventoryTransaction',
    timestamp: new Date().toISOString(),
    type,
    quantity,
    reference,
    reason
  } as const;

  try {
    await sanity
      .patch(productId)
      .append('inventory.inventoryHistory', [entry])
      .commit({ autoGenerateArrayKeys: true });
  } catch (error) {
    console.warn('[inventory] failed to log transaction', productId, error);
  }
}

export async function reserveInventory(orderItems: InventoryOrderItem[]) {
  for (const item of orderItems) {
    if (!item.productId || !validQuantity(item.quantity)) continue;

    if (item.variantSku) {
      await sanity
        .patch(item.productId)
        .inc({ 'variants[sku == $sku].inventory.quantityReserved': item.quantity })
        .commit({ sku: item.variantSku });
    } else {
      await sanity
        .patch(item.productId)
        .inc({ 'inventory.quantityReserved': item.quantity })
        .commit();
    }

    await logInventoryTransaction(item.productId, item.quantity, 'reservation', undefined, 'Checkout hold');
  }
}

export async function processOrderPayment(orderId: string, orderItems: InventoryOrderItem[]) {
  for (const item of orderItems) {
    if (!item.productId || !validQuantity(item.quantity)) continue;

    if (item.variantSku) {
      await sanity
        .patch(item.productId)
        .dec({ 'variants[sku == $sku].inventory.quantityInStock': item.quantity })
        .dec({ 'variants[sku == $sku].inventory.quantityReserved': item.quantity })
        .commit({ sku: item.variantSku });
    } else {
      await sanity
        .patch(item.productId)
        .dec({ 'inventory.quantityInStock': item.quantity })
        .dec({ 'inventory.quantityReserved': item.quantity })
        .commit();
    }

    await logInventoryTransaction(
      item.productId,
      -item.quantity,
      'sale',
      orderId,
      `Order ${orderId}`
    );
  }

  await sanity
    .patch(orderId)
    .set({
      status: 'paid',
      paymentStatus: 'paid',
      'fulfillment.status': 'unfulfilled',
      'fulfillment.fulfillmentMethod': 'ship'
    })
    .commit({ autoGenerateArrayKeys: true })
    .catch((error) => console.warn('[inventory] failed to initialize fulfillment', error));
}

export async function releaseInventory(orderId: string, orderItems: InventoryOrderItem[]) {
  for (const item of orderItems) {
    if (!item.productId || !validQuantity(item.quantity)) continue;

    if (item.variantSku) {
      await sanity
        .patch(item.productId)
        .inc({ 'variants[sku == $sku].inventory.quantityInStock': item.quantity })
        .dec({ 'variants[sku == $sku].inventory.quantityReserved': item.quantity })
        .commit({ sku: item.variantSku });
    } else {
      await sanity
        .patch(item.productId)
        .inc({ 'inventory.quantityInStock': item.quantity })
        .dec({ 'inventory.quantityReserved': item.quantity })
        .commit();
    }

    await logInventoryTransaction(
      item.productId,
      item.quantity,
      'release',
      orderId,
      'Order cancelled/refunded'
    );
  }
}

export async function handleTrackingUpdate(trackingData: any) {
  const { tracking_code, status, status_detail, tracking_details, est_delivery_date } = trackingData || {};
  if (!tracking_code) return;

  const order = await sanity
    .fetch(`*[_type == "order" && fulfillment.trackingNumber == $trackingNumber][0]`, {
      trackingNumber: tracking_code
    })
    .catch(() => null);

  if (!order?._id) return;

  const statusMap: Record<string, string> = {
    pre_transit: 'label_created',
    in_transit: 'in_transit',
    out_for_delivery: 'out_for_delivery',
    delivered: 'delivered',
    return_to_sender: 'returned',
    failure: 'failed',
    unknown: 'exception'
  };

  const newStatus = statusMap[status] || 'exception';

  await sanity
    .patch(order._id)
    .set({
      'fulfillment.status': newStatus,
      'fulfillment.estimatedDelivery': est_delivery_date,
      'fulfillment.statusDetail': status_detail
    })
    .append(
      'fulfillment.trackingEvents',
      Array.isArray(tracking_details)
        ? tracking_details.map((detail: any) => ({
            _type: 'trackingEvent',
            _key: `event-${Date.now()}-${crypto.randomUUID()}`,
            status: detail?.status,
            statusDetail: detail?.status_detail,
            message: detail?.message,
            location: detail?.tracking_location?.city,
            city: detail?.tracking_location?.city,
            state: detail?.tracking_location?.state,
            zip: detail?.tracking_location?.zip,
            country: detail?.tracking_location?.country,
            timestamp: detail?.datetime,
            source: 'easypost'
          }))
        : []
    )
    .commit({ autoGenerateArrayKeys: true });

  if (newStatus === 'delivered') {
    await sanity
      .patch(order._id)
      .set({ 'fulfillment.deliveredAt': new Date().toISOString() })
      .commit();
  }
}

export async function confirmDelivery(orderId: string) {
  await sanity
    .patch(orderId)
    .set({
      'fulfillment.status': 'delivered',
      'fulfillment.deliveredAt': new Date().toISOString()
    })
    .commit({ autoGenerateArrayKeys: true });
}
