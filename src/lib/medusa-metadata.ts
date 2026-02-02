export type MetadataCarrier = {
  metadata?: Record<string, any> | null;
  product?: { metadata?: Record<string, any> | null } | null;
  variant?: { metadata?: Record<string, any> | null; product?: { metadata?: Record<string, any> | null } | null } | null;
};

const readMetadata = (input: MetadataCarrier | null | undefined): Record<string, any> | null => {
  if (!input) return null;
  if (input.metadata && typeof input.metadata === 'object') return input.metadata as Record<string, any>;
  if (input.product?.metadata && typeof input.product.metadata === 'object') {
    return input.product.metadata as Record<string, any>;
  }
  if (input.variant?.metadata && typeof input.variant.metadata === 'object') {
    return input.variant.metadata as Record<string, any>;
  }
  if (input.variant?.product?.metadata && typeof input.variant.product.metadata === 'object') {
    return input.variant.product.metadata as Record<string, any>;
  }
  return null;
};

const readBoolean = (value: unknown): boolean | undefined =>
  typeof value === 'boolean' ? value : undefined;

export const getMetadataFlag = (
  input: MetadataCarrier | null | undefined,
  key: string
): boolean | undefined => {
  const metadata = readMetadata(input);
  if (!metadata) return undefined;
  return readBoolean(metadata[key]);
};

export const getMetadataTags = (input: MetadataCarrier | null | undefined): string[] => {
  const metadata = readMetadata(input);
  if (!metadata) return [];
  const tags = metadata.tags;
  if (!Array.isArray(tags)) return [];
  return tags.map((tag) => String(tag)).map((tag) => tag.trim()).filter(Boolean);
};

export const getRequiresShipping = (input: MetadataCarrier | null | undefined): boolean | undefined =>
  getMetadataFlag(input, 'requires_shipping');

export const getCallForShippingQuote = (
  input: MetadataCarrier | null | undefined
): boolean | undefined => getMetadataFlag(input, 'call_for_shipping_quote');

export const buildMetadataPayload = (
  input: MetadataCarrier | null | undefined
): Record<string, any> | undefined => {
  const requiresShipping = getRequiresShipping(input);
  const callForQuote = getCallForShippingQuote(input);
  const tags = getMetadataTags(input);

  const payload: Record<string, any> = {};
  if (requiresShipping !== undefined) payload.requires_shipping = requiresShipping;
  if (callForQuote !== undefined) payload.call_for_shipping_quote = callForQuote;
  if (tags.length) payload.tags = tags;

  return Object.keys(payload).length ? payload : undefined;
};
