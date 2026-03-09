import { getCallForShippingQuote, getRequiresShipping } from '@/lib/medusa-metadata';

const normalizeShippingClass = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

export function resolveProductCartMeta(product: {
  shippingClass?: unknown;
  productType?: unknown;
  metadata?: Record<string, any>;
} | null | undefined): { shippingClass?: string; installOnly: boolean } {
  const shippingClass = normalizeShippingClass(product?.shippingClass);
  const requiresShipping = getRequiresShipping(product as any);
  const callForQuote = getCallForShippingQuote(product as any);
  const normalizedShippingClass = shippingClass.toLowerCase();
  const productType = String(product?.productType || '').trim().toLowerCase();
  const installOnlyFromClass =
    /(install.?only|service|performance.?package)/.test(normalizedShippingClass) ||
    productType === 'service' ||
    productType === 'performance package';
  const installOnlyFromMetadata = requiresShipping === false || callForQuote === true || installOnlyFromClass;

  return {
    shippingClass: shippingClass || undefined,
    installOnly: Boolean(installOnlyFromMetadata)
  };
}
