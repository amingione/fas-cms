import type { SanityClient } from '@sanity/client';

export type CartLine = { productId: string; price: number; quantity: number };

export async function applyPromotion(
  client: SanityClient,
  cart: CartLine[],
  promotionCode: string,
  customerId?: string
) {
  const promotion = await client.fetch(
    `*[_type == "promotion" && code == $code && status == "active"][0]{
      _id,
      title,
      code,
      promotionType,
      discountType,
      discountValue,
      appliesTo,
      eligibleProducts[]->_id,
      eligibleCategories[]->_id,
      eligibleCollections[]->_id,
      minimumRequirements,
      customerEligibility,
      usageLimits,
      combinability,
      schedule
    }`,
    { code: promotionCode }
  );

  if (!promotion || promotion?.schedule?.isActive !== true) {
    throw new Error('Invalid or expired promotion code');
  }

  if (promotion.usageLimits?.totalUsageLimit) {
    if (promotion.usageLimits.currentUsageCount >= promotion.usageLimits.totalUsageLimit) {
      throw new Error('This promotion has reached its usage limit');
    }
  }

  if (promotion.customerEligibility?.eligibilityType === 'new_customers' && customerId) {
    const orderCount = await client.fetch(
      'count(*[_type == "order" && references($customerId) && paymentStatus == "paid"])',
      { customerId }
    );
    if ((orderCount as number) > 0) {
      throw new Error('This promotion is for new customers only');
    }
  }

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  if (promotion.minimumRequirements?.requirementType === 'min_amount') {
    if (cartTotal < promotion.minimumRequirements.minimumAmount) {
      throw new Error(`Minimum purchase of $${promotion.minimumRequirements.minimumAmount} required`);
    }
  }

  let discountAmount = 0;

  if (promotion.appliesTo === 'order') {
    if (promotion.discountType === 'percentage') {
      discountAmount = cartTotal * (promotion.discountValue / 100);
    } else if (promotion.discountType === 'fixed_amount') {
      discountAmount = promotion.discountValue;
    }
  } else if (promotion.appliesTo === 'products') {
    const eligibleProductIds: string[] = Array.isArray(promotion.eligibleProducts)
      ? promotion.eligibleProducts
      : [];
    const eligibleItems = cart.filter((item) => eligibleProductIds.includes(item.productId));
    const eligibleTotal = eligibleItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    if (promotion.discountType === 'percentage') {
      discountAmount = eligibleTotal * (promotion.discountValue / 100);
    } else if (promotion.discountType === 'fixed_amount') {
      discountAmount = Math.min(promotion.discountValue, eligibleTotal);
    }
  }

  discountAmount = Math.min(discountAmount, cartTotal);

  return {
    promotionId: promotion._id as string,
    code: promotion.code as string,
    discountAmount,
    finalTotal: cartTotal - discountAmount
  };
}

export async function trackPromotionUsage(
  client: SanityClient,
  promotionId: string,
  orderTotal: number,
  discountAmount: number
) {
  await client
    .patch(promotionId)
    .inc({ 'usageLimits.currentUsageCount': 1 })
    .inc({ 'performance.totalUses': 1 })
    .inc({ 'performance.totalRevenue': orderTotal })
    .inc({ 'performance.totalDiscount': discountAmount })
    .commit();

  const promotion = await client.getDocument(promotionId);
  const totalUses = (promotion as any)?.performance?.totalUses || 0;
  const totalRevenue = (promotion as any)?.performance?.totalRevenue || 0;
  const avgOrderValue = totalUses > 0 ? totalRevenue / totalUses : 0;

  await client.patch(promotionId).set({ 'performance.averageOrderValue': avgOrderValue }).commit();
}
