import { normalizeCartTotals, toCentsStrict } from '@/lib/money';

function asString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function parseBooleanLike(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false;
  return null;
}

function resolveCartItemThumbnail(item: any): string | null {
  const variant = item?.variant;
  const product = variant?.product;
  const metadata = product?.metadata && typeof product.metadata === 'object' ? product.metadata : null;

  return (
    asString(item?.thumbnail) ||
    asString(variant?.thumbnail) ||
    asString(product?.thumbnail) ||
    asString(product?.images?.[0]?.url) ||
    asString((metadata as any)?.thumbnail) ||
    asString((metadata as any)?.thumbnail_url) ||
    asString((metadata as any)?.thumbnailUrl) ||
    asString((metadata as any)?.image) ||
    asString((metadata as any)?.image_url) ||
    null
  );
}

function resolveCartItemVariantId(item: any): string | null {
  return (
    asString(item?.variant_id) ||
    asString(item?.metadata?.resolved_variant_id) ||
    asString(item?.metadata?.base_variant_id) ||
    asString(item?.metadata?.medusa_variant_id) ||
    null
  );
}

function resolveAppliedDiscountCodes(cart: any): string[] {
  const unique = new Set<string>();
  const promotions = Array.isArray(cart?.promotions) ? cart.promotions : [];
  const discounts = Array.isArray(cart?.discounts) ? cart.discounts : [];

  const collect = (raw: unknown) => {
    if (typeof raw !== 'string') return;
    const normalized = raw.trim();
    if (!normalized) return;
    unique.add(normalized);
  };

  for (const promo of promotions) {
    collect((promo as any)?.code);
    collect((promo as any)?.promotion_code);
    collect((promo as any)?.campaign?.code);
  }

  for (const discount of discounts) {
    collect((discount as any)?.code);
    collect((discount as any)?.discount_rule?.code);
  }

  return Array.from(unique);
}

function resolveItemShippingClass(item: any): string | null {
  const direct = asString(item?.shipping_class);
  if (direct) return direct;

  const metadataSources = [
    item?.metadata,
    item?.variant?.metadata,
    item?.variant?.product?.metadata
  ].filter((metadata) => metadata && typeof metadata === 'object');

  for (const metadata of metadataSources) {
    const value = asString((metadata as any)?.shipping_class) || asString((metadata as any)?.shippingClass);
    if (value) return value;
  }

  return null;
}

function resolveItemInstallOnly(item: any): boolean {
  const normalizedTitle = String(item?.title || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  if (normalizedTitle.includes('performancepackage') || normalizedTitle.includes('installonly')) {
    return true;
  }
  const direct = parseBooleanLike(item?.install_only);
  if (direct !== null) return direct;
  const requiresShippingDirect =
    parseBooleanLike(item?.requires_shipping) ??
    parseBooleanLike(item?.is_shipping_required);
  if (requiresShippingDirect === false) return true;

  const metadataSources = [
    item?.metadata,
    item?.variant?.metadata,
    item?.variant?.product?.metadata
  ].filter((metadata) => metadata && typeof metadata === 'object');

  for (const metadata of metadataSources) {
    const value =
      parseBooleanLike((metadata as any)?.install_only) ??
      parseBooleanLike((metadata as any)?.installOnly);
    if (value !== null) return value;
    const requiresShipping =
      parseBooleanLike((metadata as any)?.requires_shipping) ??
      parseBooleanLike((metadata as any)?.requiresShipping);
    if (requiresShipping === false) return true;
  }

  const shippingClass = String(resolveItemShippingClass(item) || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  const productType = String(item?.variant?.product?.type?.value || item?.variant?.product?.type?.name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  if (
    shippingClass.includes('installonly') ||
    shippingClass.includes('service') ||
    shippingClass.includes('performancepackage') ||
    productType.includes('service') ||
    productType.includes('performancepackage')
  ) {
    return true;
  }

  return false;
}

export function buildStorefrontCartFromMedusaCart(medusaCart: any) {
  normalizeCartTotals(medusaCart);

  const hasExplicitDiscounts =
    (Array.isArray((medusaCart as any)?.discounts) && (medusaCart as any).discounts.length > 0) ||
    (Array.isArray((medusaCart as any)?.promotions) && (medusaCart as any).promotions.length > 0);
  const discountCents = hasExplicitDiscounts
    ? toCentsStrict(medusaCart.discount_total, 'cart.discount_total') ?? 0
    : 0;

  const itemSubtotalCents = (Array.isArray(medusaCart.items) ? medusaCart.items : []).reduce(
    (sum: number, item: any) => {
      const itemTotal = toCentsStrict(item.total, 'item.total') ?? 0;
      return sum + itemTotal;
    },
    0
  );

  const medusaSubtotalCents =
    toCentsStrict(medusaCart.subtotal, 'cart.subtotal') ?? itemSubtotalCents;
  const medusaTaxCents =
    toCentsStrict(medusaCart.tax_total, 'cart.tax_total') ?? 0;
  const medusaShippingCents =
    toCentsStrict(medusaCart.shipping_total, 'cart.shipping_total') ?? 0;

  // Medusa is the single source of truth for cart totals.
  const medusaReportedTotal = toCentsStrict(medusaCart.total, 'cart.total');
  const medusaTotalCents = medusaReportedTotal ?? Math.max(0, medusaSubtotalCents + medusaShippingCents + medusaTaxCents - discountCents);

  const discountsArray: any[] = [];
  const promotions = Array.isArray(medusaCart?.promotions) ? medusaCart.promotions : [];
  const discounts = Array.isArray(medusaCart?.discounts) ? medusaCart.discounts : [];
  const totalPromotions = promotions.length + discounts.length;
  const amountPerPromotion = totalPromotions > 0 ? discountCents / totalPromotions : 0;

  for (const promo of promotions) {
    const code = asString(promo?.code) || asString(promo?.promotion_code);
    if (code) {
      discountsArray.push({
        code,
        description: asString(promo?.description),
        amount: amountPerPromotion,
        rule: promo?.application_method ? {
          type: asString(promo.application_method.type),
          value: typeof promo.application_method.value === 'number' ? promo.application_method.value : undefined,
          description: asString(promo.application_method.description)
        } : undefined
      });
    }
  }

  for (const discount of discounts) {
    const code = asString(discount?.code);
    if (code && !discountsArray.some((entry) => entry.code === code)) {
      discountsArray.push({
        code,
        description: asString(discount?.rule?.description) || asString(discount?.description),
        amount: amountPerPromotion,
        rule: discount?.rule ? {
          type: asString(discount.rule.type),
          value: typeof discount.rule.value === 'number' ? discount.rule.value : undefined,
          description: asString(discount.rule.description)
        } : undefined
      });
    }
  }

  return {
    id: medusaCart.id,
    items: (Array.isArray(medusaCart.items) ? medusaCart.items : []).map((item: any) => ({
      ...(function () {
        const effectiveUnit =
          toCentsStrict(item.unit_price, 'item.unit_price') ?? item.unit_price;
        return {
          unit_price: effectiveUnit,
          total: toCentsStrict(item.total, 'item.total') ?? effectiveUnit * item.quantity
        };
      })(),
      id: item.id,
      local_item_id: asString(item?.metadata?.local_item_id),
      medusa_variant_id: resolveCartItemVariantId(item),
      medusa_line_item_id: asString(item?.id),
      title: item.title,
      thumbnail: resolveCartItemThumbnail(item),
      variant_title: asString(item?.variant_title) ?? asString(item?.variant?.title),
      quantity: item.quantity,
      install_only: resolveItemInstallOnly(item),
      shipping_class: resolveItemShippingClass(item)
    })),
    subtotal_cents: medusaSubtotalCents,
    tax_amount_cents: medusaTaxCents,
    shipping_amount_cents: medusaShippingCents,
    discount_amount_cents: discountCents,
    applied_discount_codes: resolveAppliedDiscountCodes(medusaCart),
    discounts: discountsArray,
    total_cents: medusaTotalCents,
    email: medusaCart.email
  };
}
