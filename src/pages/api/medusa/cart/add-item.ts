import type { APIRoute } from 'astro';
import { jsonResponse } from '@/server/http/responses';
import { getMedusaConfig, medusaFetch, readJsonSafe } from '@/lib/medusa';

type IncomingCartItem = {
  id: string;
  name?: string;
  sku?: string;
  price?: number;
  quantity?: number;
  productUrl?: string;
  shippingClass?: string;
  installOnly?: boolean;
  medusaVariantId?: string;
};

function sanitizeCartItems(items: unknown): IncomingCartItem[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const entry = item as Record<string, any>;
      if (typeof entry.id !== 'string' || !entry.id.trim()) return null;
      return {
        id: entry.id,
        name: typeof entry.name === 'string' ? entry.name : undefined,
        sku: typeof entry.sku === 'string' ? entry.sku : undefined,
        price: typeof entry.price === 'number' ? entry.price : undefined,
        quantity: typeof entry.quantity === 'number' ? entry.quantity : undefined,
        productUrl: typeof entry.productUrl === 'string' ? entry.productUrl : undefined,
        shippingClass: typeof entry.shippingClass === 'string' ? entry.shippingClass : undefined,
        installOnly: typeof entry.installOnly === 'boolean' ? entry.installOnly : undefined,
        medusaVariantId:
          typeof entry.medusaVariantId === 'string' ? entry.medusaVariantId : undefined
      };
    })
    .filter(Boolean) as IncomingCartItem[];
}

export const POST: APIRoute = async ({ request }) => {
  const config = getMedusaConfig();
  if (!config) {
    return jsonResponse({ error: 'Medusa backend not configured.' }, { status: 503 }, { noIndex: true });
  }

  let body: any = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const cartId = typeof body?.cartId === 'string' ? body.cartId.trim() : '';
  if (!cartId) {
    return jsonResponse({ error: 'Missing cartId.' }, { status: 400 }, { noIndex: true });
  }

  const cartItems = sanitizeCartItems(body?.cart?.items ?? body?.items ?? body?.cartItems);
  const metadataPayload = { local_cart_items: cartItems };

  const updateResponse = await medusaFetch(`/store/carts/${cartId}`, {
    method: 'POST',
    body: JSON.stringify({ metadata: metadataPayload })
  });
  const updateData = await readJsonSafe<any>(updateResponse);

  if (!updateResponse.ok) {
    return jsonResponse(
      { error: updateData?.message || 'Failed to update Medusa cart metadata.', details: updateData },
      { status: updateResponse.status },
      { noIndex: true }
    );
  }

  const skuCache = new Map<string, string>();
  const mappings: { id: string; medusaVariantId: string }[] = [];
  const missingVariants: string[] = [];

  for (const item of cartItems) {
    let variantId = item.medusaVariantId;
    if (!variantId) {
      const sku = item.sku?.trim();
      if (!sku) {
        missingVariants.push(item.id);
        continue;
      }

      if (skuCache.has(sku)) {
        variantId = skuCache.get(sku);
      } else {
        const lookupResponse = await medusaFetch(
          `/store/product-variants?sku=${encodeURIComponent(sku)}&limit=1&fields=id,sku`,
          { method: 'GET' }
        );
        const lookupData = await readJsonSafe<any>(lookupResponse);
        if (!lookupResponse.ok) {
          return jsonResponse(
            { error: lookupData?.message || 'Failed to resolve Medusa variant by SKU.', details: lookupData },
            { status: lookupResponse.status },
            { noIndex: true }
          );
        }

        const resolved = Array.isArray(lookupData?.variants) ? lookupData.variants[0] : null;
        if (!resolved?.id) {
          missingVariants.push(item.id);
          continue;
        }

        skuCache.set(sku, resolved.id);
        variantId = resolved.id;
      }
    }

    if (!variantId) {
      missingVariants.push(item.id);
      continue;
    }

    mappings.push({ id: item.id, medusaVariantId: variantId });

    const lineItemResponse = await medusaFetch(`/store/carts/${cartId}/line-items`, {
      method: 'POST',
      body: JSON.stringify({
        variant_id: variantId,
        quantity: Math.max(1, item.quantity ?? 1),
        metadata: {
          local_item_id: item.id,
          sku: item.sku,
          product_url: item.productUrl,
          shipping_class: item.shippingClass,
          install_only: item.installOnly ?? false
        }
      })
    });
    if (!lineItemResponse.ok) {
      const lineItemData = await readJsonSafe<any>(lineItemResponse);
      return jsonResponse(
        {
          error: `Failed to add Medusa line item for ${item.id}.`,
          details: lineItemData
        },
        { status: lineItemResponse.status },
        { noIndex: true }
      );
    }
  }

  if (missingVariants.length) {
    return jsonResponse(
      {
        error: 'Missing medusaVariantId for one or more items.',
        missingItems: missingVariants
      },
      { status: 400 },
      { noIndex: true }
    );
  }

  return jsonResponse(
    {
      cart: updateData?.cart ?? null,
      mappings
    },
    { status: 200 },
    { noIndex: true }
  );
};
